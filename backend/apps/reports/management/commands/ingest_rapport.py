"""
Ingestion d’une fiche terrain (xlsx, csv, docx, doc) : prétraitement + import.

Usage :
  python manage.py ingest_rapport data/initial/
  python manage.py ingest_rapport fiche.docx --dry-run
  python manage.py ingest_rapport fiche.xlsx --user operateur
"""

from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.reports.ingest import load_rapport_rows
from apps.reports.norme import ImportValidationError
from apps.reports.pipeline import analyze_rapport_rows, import_rapport_lignes

SUPPORTED = {'.xlsx', '.csv', '.docx', '.doc'}


def _iter_files(target: Path) -> list[Path]:
    if target.is_file():
        return [target]
    if target.is_dir():
        files = [
            p
            for p in sorted(target.iterdir())
            if p.is_file() and p.suffix.lower() in SUPPORTED
        ]
        return files
    return []


class Command(BaseCommand):
    help = (
        'Prétraite et importe une fiche de suivi (.xlsx, .csv, .docx, .doc). '
        'Accepte un fichier ou un dossier (ex. data/initial/).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'cible',
            type=str,
            help='Fichier ou dossier (ex. data/initial/)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Analyse seulement, n’écrit rien en base',
        )
        parser.add_argument(
            '--create-missing',
            action='store_true',
            help='Crée les sites/groupes inconnus (CLI uniquement)',
        )
        parser.add_argument(
            '--user',
            type=str,
            default='',
            help='Username associé comme importateur',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Sortie JSON',
        )

    def handle(self, *args, **options):
        raw_target = Path(options['cible'])
        target = raw_target if raw_target.is_absolute() else Path.cwd() / raw_target
        if not target.exists():
            alt = Path(settings.PROJECT_ROOT) / raw_target
            if alt.exists():
                target = alt
        if not target.exists():
            raise CommandError(f'Introuvable : {options["cible"]}')

        files = _iter_files(target)
        if not files:
            raise CommandError(
                f'Aucun fichier .xlsx/.csv/.docx/.doc dans {target}'
            )

        user = None
        username = (options.get('user') or '').strip()
        if username:
            user = get_user_model().objects.filter(username=username).first()
            if not user:
                raise CommandError(f'Utilisateur introuvable : {username}')

        summaries = []
        had_error = False
        for path in files:
            self.stdout.write(f'→ {path.name}')
            try:
                rows = load_rapport_rows(path)
                analysis = analyze_rapport_rows(rows)
                if options['dry_run']:
                    payload = {
                        'file': path.name,
                        'ok': analysis.ok,
                        'row_count': analysis.row_count,
                        'date_debut': analysis.date_debut,
                        'date_fin': analysis.date_fin,
                        'errors': [i.message for i in analysis.errors],
                        'warnings': [i.message for i in analysis.warnings[:10]],
                    }
                    summaries.append(payload)
                    if options['json']:
                        continue
                    status = 'OK' if analysis.ok else 'ERREURS'
                    self.stdout.write(
                        f'  [{status}] {analysis.row_count} ligne(s) '
                        f'{analysis.date_debut or "?"} → {analysis.date_fin or "?"}'
                    )
                    for err in analysis.errors[:8]:
                        self.stderr.write(f'    L{err.row}: {err.message}')
                    continue

                result = import_rapport_lignes(
                    rows,
                    user=user,
                    create_missing=options['create_missing'],
                    require_entities=True,
                )
                summaries.append({
                    'file': path.name,
                    'rapport_id': result.rapport_id,
                    'imported_lines': result.imported_lines,
                    'date_debut': result.date_debut,
                    'date_fin': result.date_fin,
                })
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  Rapport n°{result.rapport_id} — {result.imported_lines} ligne(s) '
                        f'({result.date_debut} → {result.date_fin})'
                    )
                )
            except ImportValidationError as exc:
                had_error = True
                summaries.append({'file': path.name, 'error': exc.as_dict()})
                self.stderr.write(self.style.ERROR(f'  {exc.message}'))
                for err in exc.errors[:8]:
                    self.stderr.write(
                        f"    L{err.get('row')} | {err.get('column')}: {err.get('message')}"
                    )

        if options['json']:
            self.stdout.write(json.dumps(summaries, ensure_ascii=False, indent=2))
        if had_error:
            raise SystemExit(1)
