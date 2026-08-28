"""
Ingestion des fiches terrain (xlsx, csv, docx, doc) vers des lignes « norme ».

Le prétraitement manuel consistait à recoder les noms de sites / n° de groupe
en CPxxx / CJxxx / G1-… — ici on parse le fichier brut ; la résolution d’entités
est dans pipeline.py.
"""

from __future__ import annotations

import csv
import io
import re
import shutil
import subprocess
import tempfile
import unicodedata
from datetime import date
from pathlib import Path

from django.conf import settings

from apps.reports.norme import (
    ImportValidationError,
    NORME_COLUMNS,
    _friendly_error,
    _is_header_row,
    _is_section_separator,
    canonicalize_header,
    normalize_row_keys,
    rows_from_csv,
    rows_from_xlsx,
)

MONTHS_FR = {
    'janvier': 1,
    'fevrier': 2,
    'février': 2,
    'mars': 3,
    'avril': 4,
    'mai': 5,
    'juin': 6,
    'juillet': 7,
    'aout': 8,
    'août': 8,
    'septembre': 9,
    'octobre': 10,
    'novembre': 11,
    'decembre': 12,
    'décembre': 12,
}

_MONTH_ALT = '|'.join(re.escape(m) for m in MONTHS_FR)
_PERIOD_TEXT_RE = re.compile(
    rf'(?:du\s+)?(\d{{1,2}})\s*(?:au|-)\s*(\d{{1,2}})\s*({_MONTH_ALT})\s*(\d{{4}})',
    re.IGNORECASE,
)
_PERIOD_NUMERIC_RE = re.compile(
    r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*(?:au|-)\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})',
    re.IGNORECASE,
)


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize('NFKD', text)
    return ''.join(ch for ch in normalized if not unicodedata.combining(ch))


def extract_period_from_text(*texts: str | None) -> tuple[date, date] | None:
    """Lit « du 20 au 24 juillet 2026 » ou « 20/07/2026 au 24/07/2026 »."""
    blob = ' '.join(str(t or '') for t in texts)
    blob = re.sub(r'\s+', ' ', blob)
    match = _PERIOD_TEXT_RE.search(blob)
    if match:
        d1, d2, month_name, year = match.groups()
        month = MONTHS_FR.get(month_name.lower()) or MONTHS_FR.get(_strip_accents(month_name.lower()))
        if month:
            try:
                return date(int(year), month, int(d1)), date(int(year), month, int(d2))
            except ValueError:
                pass
    match = _PERIOD_NUMERIC_RE.search(blob)
    if match:
        d1, m1, y1, d2, m2, y2 = (int(x) for x in match.groups())
        try:
            return date(y1, m1, d1), date(y2, m2, d2)
        except ValueError:
            try:
                return date(y1, d1, m1), date(y2, d2, m2)
            except ValueError:
                return None
    return None


def _row_has_period(row: dict) -> bool:
    return bool(row.get('date_debut') not in (None, '') and row.get('date_fin') not in (None, ''))


def apply_period_to_rows(
    rows: list[dict],
    period: tuple[date, date] | None,
) -> list[dict]:
    if not period:
        return rows
    debut, fin = period
    for row in rows:
        if row.get('date_debut') in (None, ''):
            row['date_debut'] = debut
        if row.get('date_fin') in (None, ''):
            row['date_fin'] = fin
    return rows


def _convert_doc_with_libreoffice(raw: bytes, suffix: str) -> tuple[str, bytes]:
    soffice = shutil.which('soffice') or shutil.which('libreoffice')
    if not soffice:
        raise ImportValidationError(
            'Les fichiers Word .doc ne peuvent pas être lus sur ce serveur.',
            [
                _friendly_error(
                    row=None,
                    column=None,
                    message='LibreOffice n’est pas installé pour convertir le .doc.',
                    how_to_fix='Enregistrez la fiche en .xlsx ou .docx, puis déposez-la à nouveau.',
                )
            ],
        )
    suffix = suffix if suffix.startswith('.') else f'.{suffix}'
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        src = tmp_path / f'fiche{suffix}'
        src.write_bytes(raw)
        try:
            subprocess.run(
                [soffice, '--headless', '--norestore', '--convert-to', 'xlsx', '--outdir', str(tmp_path), str(src)],
                check=True,
                capture_output=True,
                timeout=90,
            )
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            raise ImportValidationError(
                'La fiche Word n’a pas pu être convertie.',
                [
                    _friendly_error(
                        row=None,
                        column=None,
                        message='La conversion LibreOffice a échoué.',
                        how_to_fix='Enregistrez le fichier en .xlsx (Excel) ou .docx, puis réessayez.',
                    )
                ],
            ) from exc
        produced = list(tmp_path.glob('*.xlsx'))
        if not produced:
            raise ImportValidationError(
                'La fiche Word n’a pas produit de fichier Excel.',
                [
                    _friendly_error(
                        row=None,
                        column=None,
                        message='Aucun .xlsx généré après conversion.',
                        how_to_fix='Enregistrez la fiche en .xlsx, puis déposez-la.',
                    )
                ],
            )
        out = produced[0]
        return out.name, out.read_bytes()


def _table_to_matrix(table) -> list[list[str]]:
    matrix = []
    for row in table.rows:
        cells = []
        for cell in row.cells:
            cells.append((cell.text or '').replace('\n', ' ').strip())
        matrix.append(cells)
    return matrix


def _matrix_to_rows(matrix: list[list[str]], extra_text: str = '') -> list[dict]:
    if not matrix:
        return []
    header_idx = None
    headers: list[str] = []
    for i, values in enumerate(matrix):
        if not values or all(not str(v).strip() for v in values):
            continue
        if _is_section_separator(values):
            continue
        if _is_header_row(values) or header_idx is None:
            candidate = [canonicalize_header(v) for v in values]
            if _is_header_row(values) or any(
                h in NORME_COLUMNS or h in {'site', 'id_cuve_principale', 'id_groupe'}
                for h in candidate
            ):
                headers = candidate
                header_idx = i
                if _is_header_row(values):
                    break
    if header_idx is None or not headers:
        return []

    period = extract_period_from_text(extra_text, ' '.join(headers))
    rows: list[dict] = []
    for values in matrix[header_idx + 1 :]:
        if not values or all(not str(v).strip() for v in values):
            continue
        if _is_section_separator(values):
            continue
        if _is_header_row(values):
            headers = [canonicalize_header(v) for v in values]
            continue
        raw = {}
        for idx, key in enumerate(headers):
            if not key:
                continue
            raw[key] = values[idx] if idx < len(values) else None
        normalized = normalize_row_keys(raw)
        if any(
            v is not None and str(v).strip() != ''
            for k, v in normalized.items()
            if k not in ('date_debut', 'date_fin', 'capacite_cp', 'capacite_cj', 'code_site_existant')
        ):
            rows.append(normalized)
    if period:
        apply_period_to_rows(rows, period)
    return rows


def rows_from_docx(file_bytes: bytes, filename: str = '') -> list[dict]:
    try:
        from docx import Document
    except ImportError as exc:
        raise ImportValidationError(
            'Lecture des fichiers Word .docx indisponible.',
            [
                _friendly_error(
                    row=None,
                    column=None,
                    message='Le module python-docx n’est pas installé.',
                    how_to_fix='Enregistrez la fiche en .xlsx ou installez python-docx.',
                )
            ],
        ) from exc

    try:
        document = Document(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ImportValidationError(
            'Le fichier Word n’a pas pu être ouvert.',
            [
                _friendly_error(
                    row=None,
                    column=None,
                    message='Le .docx est peut-être endommagé.',
                    how_to_fix='Ouvrez-le dans Word et enregistrez-le en .xlsx, puis réessayez.',
                )
            ],
        ) from exc

    paragraphs = ' '.join(p.text for p in document.paragraphs if p.text)
    title_text = f'{filename} {paragraphs}'
    best_rows: list[dict] = []
    for table in document.tables:
        rows = _matrix_to_rows(_table_to_matrix(table), extra_text=title_text)
        if len(rows) > len(best_rows):
            best_rows = rows

    period = extract_period_from_text(title_text)
    if period:
        apply_period_to_rows(best_rows, period)

    if not best_rows:
        raise ImportValidationError(
            'Aucun tableau de relevés trouvé dans le Word.',
            [
                _friendly_error(
                    row=None,
                    column=None,
                    message='La fiche ne contient pas de tableau lisible (site, groupe, quantités).',
                    how_to_fix='Enregistrez la fiche en Excel (.xlsx) au format de suivi, puis déposez-la.',
                )
            ],
        )
    return best_rows


def load_rapport_rows_from_bytes(filename: str, raw: bytes) -> list[dict]:
    lower = (filename or 'rapport').lower()
    period_hint = extract_period_from_text(filename)

    if lower.endswith('.xlsx'):
        rows = rows_from_xlsx(raw)
    elif lower.endswith('.csv'):
        rows = rows_from_csv(raw)
    elif lower.endswith('.docx'):
        rows = rows_from_docx(raw, filename=filename)
    elif lower.endswith('.doc'):
        _converted_name, converted = _convert_doc_with_libreoffice(raw, '.doc')
        rows = rows_from_xlsx(converted)
    else:
        raise ImportValidationError(
            'Type de fichier non accepté.',
            [
                _friendly_error(
                    row=None,
                    column=None,
                    message=f'Le fichier « {filename} » n’est pas un Excel, un CSV ou un Word.',
                    how_to_fix='Déposez un fichier .xlsx, .csv, .docx ou .doc (fiche de suivi).',
                )
            ],
        )

    if period_hint:
        apply_period_to_rows(rows, period_hint)
    if not any(_row_has_period(r) for r in rows):
        # Dernier recours : scanner les valeurs déjà lues
        blob = ' '.join(
            str(v)
            for row in rows[:3]
            for v in row.values()
            if v not in (None, '')
        )
        fallback = extract_period_from_text(filename, blob)
        if fallback:
            apply_period_to_rows(rows, fallback)
    return rows


def load_rapport_rows(path: str | Path) -> list[dict]:
    path = Path(path)
    if not path.exists():
        raise ImportValidationError(
            f'Fichier introuvable : {path}',
            [
                _friendly_error(
                    row=None,
                    column=None,
                    message=f'Le fichier « {path} » n’existe pas.',
                    how_to_fix='Vérifiez le chemin du fichier (.xlsx, .csv, .docx ou .doc).',
                )
            ],
        )
    return load_rapport_rows_from_bytes(path.name, path.read_bytes())


def default_preprocessed_dir() -> Path:
    return Path(settings.PROJECT_ROOT) / 'data' / 'exports' / 'rapports'


def write_preprocessed_export(
    rows: list[dict],
    date_debut: date | str,
    date_fin: date | str,
) -> Path | None:
    """Écrit le CSV norme après import (artefact data/exports/rapports/<période>/)."""
    debut = date_debut.isoformat() if hasattr(date_debut, 'isoformat') else str(date_debut)
    fin = date_fin.isoformat() if hasattr(date_fin, 'isoformat') else str(date_fin)
    out_dir = default_preprocessed_dir() / f'{debut}_{fin}'
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        dest = out_dir / 'lignes.csv'
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=NORME_COLUMNS, extrasaction='ignore', lineterminator='\n')
        writer.writeheader()
        for row in rows:
            payload = {col: row.get(col, '') for col in NORME_COLUMNS}
            for key in ('date_debut', 'date_fin'):
                value = payload.get(key)
                if hasattr(value, 'isoformat'):
                    payload[key] = value.isoformat()
            writer.writerow(payload)
        dest.write_text(buffer.getvalue(), encoding='utf-8-sig')
        return dest
    except OSError:
        return None
