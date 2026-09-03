"""
Ingestion d’une fiche terrain (Excel / CSV / Word) vers Rapport + LigneRapport.

Usage :
  python manage.py ingest_rapport
  python manage.py ingest_rapport ../data/initial --dry-run
  python manage.py ingest_rapport fiche.xlsx --user operateur
"""

from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.reports.norme import ImportValidationError
from apps.reports.pipeline import analyze_rapport_rows, import_rapport_file, load_rapport_rows

_SUFFIXES = ('.xlsx', '.csv', '.docx', '.doc')


class Command(BaseCommand):
    help = (
        'Lit une fiche terrain (.xlsx/.csv/.docx/.doc), la mappe vers les codes internes '
        'et importe les lignes. Par défaut : dossier data/initial.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'chemin',
            nargs='?',
            default='',
            help='Fichier ou dossier (défaut : data/initial)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Analyse seulement, sans écrire en base',
        )
        parser.add_argument(
            '--user',
            type=str,
            default='',
            help='Username importateur (ex. operateur)',
        )
        parser.add_argument(
            '--create-missing',
            action='store_true',
            help='Crée les sites/groupes inconnus (réservé admin / CLI)',
        )
        parser.add_argument('--json', action='store_true', help='Sortie JSON')

    def handle(self, *args, **options):
        raw_path = (options.get('chemin') or '').strip()
        target = Path(raw_path) if raw_path else Path(settings.PROJECT_ROOT) / 'data' / 'initial'
        if not target.is_absolute():
            cwd_candidate = Path.cwd() / target
            target = cwd_candidate if cwd_candidate.exists() else Path(settings.PROJECT_ROOT) / target
        if not target.exists():
            raise CommandError(f'Introuvable : {target}')

        files: list[Path]
        if target.is_dir():
            files = sorted(
                p for p in target.iterdir() if p.is_file() and p.suffix.lower() in _SUFFIXES
            )
        else:
            files = [target]
        if not files:
            raise CommandError(f'Aucun fichier {_SUFFIXES} dans {target}')

        user = None
        username = (options.get('user') or '').strip()
        if username:
            user = get_user_model().objects.filter(username=username).first()
            if not user:
                raise CommandError(f'Utilisateur introuvable : {username}')

        summaries = []
        failed = False
        for path in files:
            self.stdout.write(self.style.NOTICE(f'→ {path.name}'))
            try:
                rows = load_rapport_rows(path)
                if options['dry_run']:
                    analysis = analyze_rapport_rows(rows)
                    summaries.append({'file': path.name, 'analysis': analysis.to_dict()})
                    self.stdout.write(
                        f'  Lignes={analysis.row_count}  '
                        f'{analysis.date_debut or "—"} → {analysis.date_fin or "—"}  '
                        f'nouveaux: sites={len(analysis.new_cuves_principales)} '
                        f'CJ={len(analysis.new_cuves_journalieres)} '
                        f'groupes={len(analysis.new_groupes)}'
                    )
                    if not analysis.ok:
                        failed = True
                    continue
                result = import_rapport_file(
                    path,
                    user=user,
                    create_missing=options['create_missing'],
                    require_entities=True,
                )
                summaries.append({'file': path.name, 'import': result.to_dict()})
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  Rapport n°{result.rapport_id}  '
                        f'{result.date_debut} → {result.date_fin}  '
                        f'{result.imported_lines} ligne(s)'
                    )
                )
            except ImportValidationError as exc:
                failed = True
                summaries.append({'file': path.name, 'error': exc.as_dict()})
                self.stderr.write(self.style.ERROR(f'  {exc.message}'))
                for err in exc.errors[:8]:
                    self.stderr.write(
                        f"    L{err.get('row')} | {err.get('column')}: {err.get('message')}"
                    )

        if options['json']:
            self.stdout.write(json.dumps(summaries, ensure_ascii=False, indent=2, default=str))
        if failed:
            raise SystemExit(1)
