"""
Vide les données métier (sites, cuves, groupes, rapports).

Usage :
  python manage.py reset_data
  python manage.py reset_data --noinput
  python manage.py reset_data --with-users --with-alerts
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.reports.models import LigneRapport, Rapport
from apps.sites.models import Site
from apps.equipment.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene

from ...utils import reset_autoincrement


class Command(BaseCommand):
    help = (
        'Supprime le référentiel et les rapports '
        '(sites, CP, CJ, groupes, lignes), remet les IDs à 1 et vide '
        'les alertes/notifications associées.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--noinput',
            action='store_true',
            help='Ne pas demander de confirmation',
        )
        parser.add_argument(
            '--with-users',
            action='store_true',
            help='Supprimer aussi les utilisateurs non-superuser (+ profils)',
        )
        parser.add_argument(
            '--with-alerts',
            action='store_true',
            help='Conserver la compatibilité avec l’ancienne API (les alertes/notifications sont toujours supprimées par défaut)',
        )
        parser.add_argument(
            '--skip-alerts',
            action='store_true',
            help='Ne pas supprimer alertes et notifications',
        )

    def handle(self, *args, **options):
        if not options['noinput']:
            confirm = input(
                'Vider sites / cuves / groupes / rapports'
                + (' / users' if options['with_users'] else '')
                + (' / alertes' if options['with_alerts'] else '')
                + ' (IDs remis à 1) ? [y/N] '
            )
            if confirm.strip().lower() not in {'y', 'yes', 'o', 'oui'}:
                self.stdout.write(self.style.WARNING('Annulé.'))
                return

        counts = {}
        tables: list[str] = []

        counts['lignes'] = LigneRapport.objects.count()
        LigneRapport.objects.all().delete()
        tables.append(LigneRapport._meta.db_table)

        counts['rapports'] = Rapport.objects.count()
        Rapport.objects.all().delete()
        tables.append(Rapport._meta.db_table)

        counts['cuves_journalieres'] = CuveJournaliere.objects.count()
        CuveJournaliere.objects.all().delete()
        tables.append(CuveJournaliere._meta.db_table)

        counts['groupes'] = GroupeElectrogene.objects.count()
        GroupeElectrogene.objects.all().delete()
        tables.append(GroupeElectrogene._meta.db_table)

        counts['cuves_principales'] = CuvePrincipale.objects.count()
        CuvePrincipale.objects.all().delete()
        tables.append(CuvePrincipale._meta.db_table)

        counts['sites'] = Site.objects.count()
        Site.objects.all().delete()
        tables.append(Site._meta.db_table)

        if not options['skip_alerts'] or options['with_alerts']:
            try:
                from apps.alerts.models import Alerte
                from apps.notifications.models import Notification

                counts['notifications'] = Notification.objects.count()
                Notification.objects.all().delete()
                tables.append(Notification._meta.db_table)

                counts['alertes'] = Alerte.objects.count()
                Alerte.objects.all().delete()
                tables.append(Alerte._meta.db_table)
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(self.style.WARNING(f'Alertes/notifications : {exc}'))

        if options['with_users']:
            User = get_user_model()
            from apps.authentication.models import ProfilUtilisateur

            qs = User.objects.filter(is_superuser=False)
            counts['users'] = qs.count()
            qs.delete()
            tables.append(User._meta.db_table)
            tables.append(ProfilUtilisateur._meta.db_table)

        reset_tables = reset_autoincrement(tables)

        self.stdout.write(self.style.SUCCESS('Reset terminé :'))
        for key, value in counts.items():
            self.stdout.write(f'  • {key}: {value} supprimé(s)')
        if reset_tables:
            self.stdout.write(
                self.style.SUCCESS(
                    f'  • séquences remises à 1 : {", ".join(reset_tables)}'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING('  • aucune séquence réinitialisée (backend DB non supporté)')
            )
