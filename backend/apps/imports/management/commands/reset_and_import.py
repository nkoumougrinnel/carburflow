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
from django.db import connection


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
        parser.add_argument(
            '--skip-alerts',
            action='store_true',
            help='Ne pas déclencher la détection des alertes après import',
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
            with_alerts=True,
            stdout=self.stdout,
            stderr=self.stderr,
        )
        connection.close()

        import_kwargs = {
            'skip_users': options['skip_users'],
            'skip_lignes': options['skip_lignes'],
        }
        if options.get('dir'):
            import_kwargs['dir'] = options['dir']

        call_command('import_data', stdout=self.stdout, stderr=self.stderr, **import_kwargs)
        self.stdout.write(self.style.SUCCESS('Reset + import terminés.'))

        # --- Détection et persistance des alertes après import ---
        # Déclenche toutes les alertes du rapport :
        #   - conso_sans_horaire   : consommation sans delta horaire
        #   - sites à faible autonomie : autonomie_critique / autonomie_preventive
        #   - horaire_sans_conso   : delta horaire sans consommation
        #   - ecart_conso          : écart de consommation horaire > 15%
        #
        # Les alertes de données (conso_sans_horaire, horaire_sans_conso, ecart_conso)
        # restent actives même aux semaines suivantes car elles nécessitent un traitement
        # manuel. Seules les alertes d'autonomie peuvent être auto-levées si le niveau
        # remonte au rapport suivant (auto_ignorer_levees=True pour l'autonomie uniquement).
        if not options.get('skip_alerts'):
            self.stdout.write('Détection des alertes en cours…')
            try:
                from apps.alerts.services.detection import detecter_et_persister_alertes
                result = detecter_et_persister_alertes(auto_ignorer_levees=True)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Alertes détectées : {result['created']} créées, "
                        f"{result['updated']} mises à jour, "
                        f"{result['ignored']} ignorées (autonomie levée), "
                        f"{result['active']} actives au total."
                    )
                )
            except Exception as exc:  # pylint: disable=broad-except
                self.stderr.write(
                    self.style.ERROR(f'Erreur lors de la détection des alertes : {exc}')
                )

