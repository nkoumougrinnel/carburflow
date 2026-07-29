"""Tests unitaires — modèles de l’app sites."""

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from apps.sites.models import CuveJournaliere, CuvePrincipale, Site

from tests.helpers import make_cj, make_cp, make_groupe, make_site


class SiteModelTests(TestCase):
    def test_create_site(self):
        site = make_site(nom='BEPANDA INTERNATIONAL', localisation='Douala')
        self.assertEqual(str(site), 'BEPANDA INTERNATIONAL')
        self.assertEqual(site.statut, Site.STATUT_ACTIF)

    def test_site_nom_unique(self):
        make_site(nom='AKWA')
        with self.assertRaises(IntegrityError):
            make_site(nom='AKWA')


class CuvePrincipaleModelTests(TestCase):
    def setUp(self):
        self.site = make_site(nom='SITE CP')

    def test_create_cp_normalise_identifiant(self):
        cp = make_cp(self.site, identifiant='cp001')
        self.assertEqual(cp.identifiant, 'CP001')
        self.assertEqual(str(cp), 'CP001 - SITE CP')

    def test_cp_identifiant_invalide(self):
        with self.assertRaises(ValidationError):
            make_cp(self.site, identifiant='BEPANDA INTERNATIONAL')

    def test_cp_identifiant_unique(self):
        make_cp(self.site, identifiant='CP001')
        with self.assertRaises(ValidationError):
            make_cp(self.site, identifiant='CP001')

    def test_cascade_delete_site_supprime_cp(self):
        make_cp(self.site, identifiant='CP010')
        self.site.delete()
        self.assertEqual(CuvePrincipale.objects.count(), 0)


class GroupeEtCuveJournaliereModelTests(TestCase):
    def setUp(self):
        self.site = make_site(nom='SITE CJ')
        self.cp = make_cp(self.site, identifiant='CP001')
        self.groupe = make_groupe(identifiant='G1-TEST-100')

    def test_create_cj_cJxxx(self):
        cj = make_cj(self.cp, self.groupe, identifiant='cj001')
        self.assertEqual(cj.identifiant, 'CJ001')
        self.assertEqual(cj.groupe_electrogene, self.groupe)

    def test_cj_identifiant_invalide(self):
        with self.assertRaises(ValidationError):
            make_cj(self.cp, identifiant='BEPANDA INTERNATIONAL')

    def test_cj_sans_groupe_autorise(self):
        cj = make_cj(self.cp, groupe=None, identifiant='CJ002')
        self.assertIsNone(cj.groupe_electrogene_id)

    def test_cj_groupe_one_to_one(self):
        make_cj(self.cp, self.groupe, identifiant='CJ001')
        with self.assertRaises((ValidationError, IntegrityError)):
            make_cj(self.cp, self.groupe, identifiant='CJ002')

    def test_cascade_delete_cp_supprime_cj(self):
        make_cj(self.cp, self.groupe, identifiant='CJ001')
        self.cp.delete()
        self.assertEqual(CuveJournaliere.objects.count(), 0)
