"""
Reset des données métier puis réimport depuis `data/imports/`.

Usage :
  python manage.py reset_and_import
  python manage.py reset_and_import --noinput
  python manage.py reset_and_import --noinput --skip-users
"""

from __future__ import annotations

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Vide le référentiel/rapports puis lance import_data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--noinput',
            action='store_true',
            help='Ne pas demander de confirmation',
        )
        parser.add_argument(
            '--dir',
            type=str,
            default='',
            help='Répertoire CSV (transmis à import_data)',
        )
        parser.add_argument(
            '--skip-users',
            action='store_true',
            help='Ne pas réimporter users.csv',
        )
        parser.add_argument(
            '--skip-lignes',
            action='store_true',
            help='Ne pas réimporter lignes_rapport.csv',
        )
        parser.add_argument(
            '--with-users',
            action='store_true',
            help='Aussi supprimer les users non-superuser avant import',
        )

    def handle(self, *args, **options):
        if not options['noinput']:
            confirm = input(
                'Reset + réimport depuis data/imports/ ? [y/N] '
            )
            if confirm.strip().lower() not in {'y', 'yes', 'o', 'oui'}:
                self.stdout.write(self.style.WARNING('Annulé.'))
                return

        call_command(
            'reset_data',
            noinput=True,
            with_users=options['with_users'],
            stdout=self.stdout,
            stderr=self.stderr,
        )

        import_kwargs = {
            'skip_users': options['skip_users'],
            'skip_lignes': options['skip_lignes'],
        }
        if options.get('dir'):
            import_kwargs['dir'] = options['dir']

        call_command('import_data', stdout=self.stdout, stderr=self.stderr, **import_kwargs)
        self.stdout.write(self.style.SUCCESS('Reset + import terminés.'))
