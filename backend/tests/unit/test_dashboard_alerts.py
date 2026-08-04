from datetime import date
from types import SimpleNamespace
from unittest import TestCase

from apps.alerts.models import Alerte
from apps.alerts.services.detection import _upsert_active
from apps.api.views import serialize_dashboard_alerts


class DashboardAlertsTests(TestCase):
    def test_serialize_dashboard_alerts_uses_active_alert_payloads(self):
        alerts = [
            SimpleNamespace(
                cle='site-3',
                type_alerte='autonomie_critique',
                priorite='critique',
                message='Site urgent — autonomie critique',
                donnees_contexte={'cuve_principale_id': 3, 'site_name': 'CT AKWA CENTRE'},
                etat='nouvelle',
                site_id=None,
                groupe_electrogene_id=None,
                date_apparition=None,
            ),
            SimpleNamespace(
                cle='groupe-2',
                type_alerte='ecart_conso',
                priorite='moyenne',
                message='Écart de consommation\nDétail',
                donnees_contexte={'groupe_id': 2, 'groupe_label': 'G2'},
                etat='en_cours',
                site_id=None,
                groupe_electrogene_id=2,
                date_apparition=None,
            ),
        ]

        payload = serialize_dashboard_alerts(alerts)

        self.assertEqual(payload[0]['id'], 'site-3')
        self.assertEqual(payload[0]['target'], 'site')
        self.assertEqual(payload[0]['priority'], 'Critique')
        self.assertEqual(payload[0]['priority_level'], 'critical')

        self.assertEqual(payload[1]['id'], 'groupe-2')
        self.assertEqual(payload[1]['target'], 'groups')
        self.assertEqual(payload[1]['priority'], 'Moyenne')
        self.assertEqual(payload[1]['priority_level'], 'medium')
        self.assertEqual(payload[1]['title'], 'Écart de consommation')
        self.assertEqual(payload[1]['subtitle'], 'Détail')

    def test_upsert_active_updates_date_apparition_for_existing_alert(self):
        alerte = Alerte.objects.create(
            cle='groupe-2-ecart_conso-3',
            message='Alerte existante',
            type_alerte='ecart_conso',
            priorite='moyenne',
            etat='nouvelle',
            date_apparition=date(2026, 8, 4),
        )

        updated, should_alert = _upsert_active(
            alerte.cle,
            cle=alerte.cle,
            message='Alerte existante',
            type_alerte='ecart_conso',
            priorite='moyenne',
            etat='nouvelle',
            date_apparition=date(2026, 7, 17),
        )

        self.assertFalse(should_alert)
        self.assertEqual(updated.date_apparition, date(2026, 7, 17))
        self.assertEqual(Alerte.objects.get(pk=alerte.pk).date_apparition, date(2026, 7, 17))
