from django.core.management.base import BaseCommand

from apps.alerts.services import detecter_et_persister_alertes


class Command(BaseCommand):
    help = (
        'Détecte les alertes métier à partir des calculs groupes '
        'et les enregistre en base.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-stale',
            action='store_true',
            help='Ne pas ignorer automatiquement les alertes dont la condition a disparu',
        )

    def handle(self, *args, **options):
        result = detecter_et_persister_alertes(
            auto_ignorer_levees=not options['keep_stale'],
        )
        self.stdout.write(
            self.style.SUCCESS(
                'Alertes — créées={created} mises_à_jour={updated} '
                'ignorées={ignored} actives={active}'.format(**result)
            )
        )
