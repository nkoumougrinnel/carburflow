"""
Parsers CSV / JSON pour le pipeline d'import (`data/imports/`).
"""

from __future__ import annotations

import csv
import io
import json
import re
from pathlib import Path
from typing import Any, Iterable


COLUMN_ALIASES: dict[str, str] = {
    # sites
    'nom': 'nom',
    'nom_site': 'nom',
    'id_site': 'nom',
    'site': 'site',
    'localisation': 'localisation',
    'ville': 'ville',
    'adresse': 'adresse',
    'code': 'code',
    'statut': 'statut',
    # cuves (codes gardés contextuels : identifiant / cuve_principale / cuve_journaliere)
    'capacite': 'capacite',
    'capcite': 'capacite',
    # groupes / liaisons
    'groupe': 'groupe',
    'groupe_marque': 'groupe',
    'marque': 'marque',
    'marque_groupe': 'marque',
    'puissance': 'puissance',
    'puissance_groupe': 'puissance',
    # lignes rapport
    'date_debut': 'date_debut',
    'date_fin': 'date_fin',
    'quantite_cuve_principale': 'quantite_cuve_principale',
    'quantités_cuve_principale': 'quantite_cuve_principale',
    'quantites_cuve_principale': 'quantite_cuve_principale',
    'quantite_gasoil_cuve_principale': 'quantite_cuve_principale',
    'quantite_cuve_journaliere': 'quantite_cuve_journaliere',
    'quantite_gasoil_cuve_journaliere': 'quantite_cuve_journaliere',
    'depotage': 'depotage',
    'compteur_horaire': 'compteur_horaire',
    'etat_fonctionnement': 'etat_fonctionnement',
    'état_fonctionnement': 'etat_fonctionnement',
    'observations': 'observations',
    # users
    'username': 'username',
    'email': 'email',
    'password': 'password',
    'role': 'role',
    'first_name': 'first_name',
    'last_name': 'last_name',
    'prenom': 'first_name',
    'nom_famille': 'last_name',
}

CP_CODE_RE = re.compile(r'^CP(\d+)$', re.IGNORECASE)
CP_LOOSE_RE = re.compile(r'^cp0*(\d+)$', re.IGNORECASE)
CJ_CODE_RE = re.compile(r'^CJ(\d+)$', re.IGNORECASE)
CJ_LOOSE_RE = re.compile(r'^cj0*(\d+)$', re.IGNORECASE)


def normalize_header(name: Any) -> str:
    raw = str(name or '').strip().lstrip('\ufeff').lower().replace(' ', '_')
    raw = (
        raw.replace('é', 'e')
        .replace('è', 'e')
        .replace('ê', 'e')
        .replace('à', 'a')
        .replace('ô', 'o')
    )
    return COLUMN_ALIASES.get(raw, raw)


def detect_delimiter(sample: str) -> str:
    first = next(
        (
            line
            for line in sample.splitlines()
            if line.strip() and not line.lstrip().startswith('#')
        ),
        '',
    )
    for delimiter in ('\t', ';', ','):
        if delimiter in first:
            return delimiter
    return ','


def decode_bytes(raw: bytes) -> str:
    if raw.startswith(b'\xff\xfe') or raw.startswith(b'\xfe\xff'):
        return raw.decode('utf-16')
    try:
        return raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        return raw.decode('latin-1')


def parse_csv(path: Path | str) -> list[dict[str, Any]]:
    """Lit un CSV et renvoie des dicts aux clés normalisées."""
    path = Path(path)
    if not path.exists() or path.stat().st_size == 0:
        return []

    text = decode_bytes(path.read_bytes()).replace('\r\n', '\n').replace('\r', '\n')
    lines = [
        line
        for line in text.splitlines()
        if line.strip() and not line.lstrip().startswith('#')
    ]
    if not lines:
        return []

    cleaned = '\n'.join(lines)
    reader = csv.DictReader(io.StringIO(cleaned), delimiter=detect_delimiter(cleaned))
    if not reader.fieldnames:
        return []

    rows: list[dict[str, Any]] = []
    for raw in reader:
        row: dict[str, Any] = {}
        for key, value in raw.items():
            if key is None:
                continue
            canon = normalize_header(key)
            if canon in row and (value is None or str(value).strip() == ''):
                continue
            row[canon] = value.strip() if isinstance(value, str) else value
        if any(str(v or '').strip() for v in row.values()):
            rows.append(row)
    return rows


def parse_json(path: Path | str) -> Any:
    path = Path(path)
    if not path.exists() or path.stat().st_size == 0:
        return []
    return json.loads(path.read_text(encoding='utf-8-sig'))


def cell(row: dict, *names: str, default: Any = None) -> Any:
    for name in names:
        key = normalize_header(name)
        if key in row and row[key] not in (None, ''):
            return row[key]
        if name in row and row[name] not in (None, ''):
            return row[name]
    return default


def to_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(',', '.').replace(' ', '')
    if text.lower() in {'', 'nan', 'none', 'null'}:
        return default
    try:
        return float(text)
    except ValueError:
        return default


def to_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def normalize_cp_code(raw: str | None) -> str | None:
    text = to_str(raw)
    if not text:
        return None
    match = CP_CODE_RE.match(text) or CP_LOOSE_RE.match(text)
    if match:
        return f'CP{int(match.group(1)):03d}'
    return None


def normalize_cj_code(raw: str | None) -> str | None:
    text = to_str(raw)
    if not text:
        return None
    match = CJ_CODE_RE.match(text) or CJ_LOOSE_RE.match(text)
    if match:
        return f'CJ{int(match.group(1)):03d}'
    return None


def write_csv(path: Path | str, fieldnames: Iterable[str], rows: list[dict]) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = list(fieldnames)
    with path.open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, '') for k in fields})
    return path
