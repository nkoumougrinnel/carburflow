"""
Importe les CSV de `data/imports/` vers la base.

Usage :
  python manage.py import_data
  python manage.py import_data --dir /chemin/data/imports
  python manage.py import_data --dry-run
  python manage.py import_data --skip-users --skip-lignes
"""

from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from ...services import ImportDataService, default_imports_dir


class Command(BaseCommand):
    help = (
        'Parse, valide et importe users/sites/cuves/groupes/lignes '
        'depuis data/imports/.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dir',
            type=str,
            default='',
            help='Répertoire CSV (défaut : <repo>/data/imports)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Valide sans écrire en base',
        )
        parser.add_argument(
            '--skip-users',
            action='store_true',
            help='Ne pas importer users.csv',
        )
        parser.add_argument(
            '--skip-lignes',
            action='store_true',
            help='Ne pas importer lignes_rapport.csv',
        )

    def handle(self, *args, **options):
        raw = (options.get('dir') or '').strip()
        imports_dir = Path(raw) if raw else default_imports_dir()
        if not imports_dir.is_absolute():
            imports_dir = Path.cwd() / imports_dir
        imports_dir = imports_dir.resolve()

        if not imports_dir.is_dir():
            raise CommandError(f'Répertoire introuvable : {imports_dir}')

        self.stdout.write(self.style.NOTICE(f'Import depuis : {imports_dir}'))

        service = ImportDataService(
            imports_dir,
            skip_users=options['skip_users'],
            skip_lignes=options['skip_lignes'],
            dry_run=options['dry_run'],
        )
        try:
            stats, validation = service.run()
        except FileNotFoundError as exc:
            raise CommandError(str(exc)) from exc

        if not validation.ok:
            self.stderr.write(self.style.ERROR('Validation échouée :'))
            for err in validation.errors[:30]:
                self.stderr.write(
                    self.style.ERROR(
                        f'  {err.file}:L{err.row} [{err.field}] {err.message}'
                    )
                )
            raise SystemExit(1)

        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS('Dry-run OK — aucune écriture.'))
            return

        self.stdout.write(self.style.SUCCESS(f'users              : {stats.users}'))
        self.stdout.write(self.style.SUCCESS(f'sites              : {stats.sites}'))
        self.stdout.write(self.style.SUCCESS(f'cuves principales  : {stats.cuves_principales}'))
        self.stdout.write(self.style.SUCCESS(f'groupes            : {stats.groupes}'))
        self.stdout.write(self.style.SUCCESS(f'cuves journalières : {stats.cuves_journalieres}'))
        self.stdout.write(self.style.SUCCESS(f'liaisons CJ↔groupe : {stats.liaisons_cj_groupe}'))
        self.stdout.write(
            self.style.SUCCESS(f'rapports / lignes  : {stats.rapports} / {stats.lignes}')
        )
        for warning in stats.warnings:
            self.stdout.write(self.style.WARNING(f'  ⚠ {warning}'))
        if stats.missing_files:
            self.stdout.write(
                self.style.WARNING(f'Fichiers absents/vides : {", ".join(stats.missing_files)}')
            )
        self.stdout.write(self.style.SUCCESS('Import terminé (voir data/logs/import.log).'))
