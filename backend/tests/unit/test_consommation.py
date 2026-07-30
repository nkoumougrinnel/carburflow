"""Tests unitaires — formules de consommation (prélèvements / agrégation)."""

from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.api.services import calculs as calc


def _line(*, cp, cj, depotage=0.0):
    return SimpleNamespace(
        quantite_gasoil_cuve_principale=cp,
        quantite_gasoil_cuve_journaliere=cj,
        depotage=depotage,
    )


class ConsommationPrelevementsTests(SimpleTestCase):
    def test_prelevement_cp_vers_cj_ne_compte_pas_comme_conso(self):
        """
        CP 10000→9000 et CJ 0→1000 : prélèvement interne, conso = 0.
        (Avant : on aurait compté 1000 L à tort sur les groupes.)
        """
        reports = [SimpleNamespace(id=1), SimpleNamespace(id=2)]
        site = SimpleNamespace(id=10)
        lines_by_site_report = {
            (10, 1): [_line(cp=10000, cj=0)],
            (10, 2): [_line(cp=9000, cj=1000)],
        }
        state = calc.build_site_report_state(reports, [site], lines_by_site_report)
        self.assertEqual(state[(10, 1)]['delta'], 0.0)
        self.assertEqual(state[(10, 2)]['delta'], 0.0)

    def test_conso_reelle_apres_baisse_globale(self):
        """CP+CJ baisse de 500 L (hors dépotage) → conso 500."""
        reports = [SimpleNamespace(id=1), SimpleNamespace(id=2)]
        site = SimpleNamespace(id=10)
        lines_by_site_report = {
            (10, 1): [_line(cp=10000, cj=1000), _line(cp=10000, cj=500)],
            (10, 2): [_line(cp=9500, cj=800), _line(cp=9500, cj=400)],
        }
        # prev total = 10000+1000+500 = 11500
        # curr total = 9500+800+400 = 10700 → delta 800
        state = calc.build_site_report_state(reports, [site], lines_by_site_report)
        self.assertEqual(state[(10, 2)]['delta'], 800.0)

    def test_depotage_ajoute_a_la_conso(self):
        reports = [SimpleNamespace(id=1), SimpleNamespace(id=2)]
        site = SimpleNamespace(id=10)
        lines_by_site_report = {
            (10, 1): [_line(cp=5000, cj=0)],
            (10, 2): [_line(cp=5000, cj=0, depotage=200)],
        }
        state = calc.build_site_report_state(reports, [site], lines_by_site_report)
        self.assertEqual(state[(10, 2)]['delta'], 200.0)

    def test_somme_conso_groupes(self):
        blocks = [
            {'consumption': [0.0, 100.0, None]},
            {'consumption': [0.0, 50.0, 20.0]},
        ]
        series = calc.somme_conso_groupes(blocks, 3)
        self.assertEqual(series, [0.0, 150.0, 20.0])
