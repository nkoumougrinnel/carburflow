"""
Exporte le référentiel et les lignes vers `data/exports/export_<timestamp>/`.

Usage :
  python manage.py export_data
  python manage.py export_data --dir /chemin/data/exports
"""

from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.services.imports import ExportDataService, default_exports_dir


class Command(BaseCommand):
    help = 'Exporte sites, cuves, groupes, lignes et users en CSV.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dir',
            type=str,
            default='',
            help='Répertoire parent des exports (défaut : <repo>/data/exports)',
        )

    def handle(self, *args, **options):
        raw = (options.get('dir') or '').strip()
        exports_dir = Path(raw) if raw else default_exports_dir()
        if not exports_dir.is_absolute():
            exports_dir = Path.cwd() / exports_dir
        exports_dir = exports_dir.resolve()

        try:
            written = ExportDataService(exports_dir).run()
        except OSError as exc:
            raise CommandError(str(exc)) from exc

        out = next(iter(written.values())).parent if written else exports_dir
        self.stdout.write(self.style.SUCCESS(f'Export écrit dans : {out}'))
        for name, path in written.items():
            self.stdout.write(f'  • {name}: {path.name}')
        self.stdout.write(self.style.NOTICE('Log : data/logs/export.log'))
