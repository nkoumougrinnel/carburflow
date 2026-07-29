"""Tests API — référentiel sites / cuves / groupes."""

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.models import ProfilUtilisateur
from apps.sites.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene, Site

from tests.helpers import make_cj, make_cp, make_groupe, make_site, make_user


class SitesAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_user(username='admin', role=ProfilUtilisateur.ROLE_ADMIN)
        self.agent = make_user(username='agent', role=ProfilUtilisateur.ROLE_AGENT)
        self.site = make_site(nom='BEPANDA INTERNATIONAL')
        self.cp = make_cp(self.site, identifiant='CP001', capacite=40000)
        self.groupe = make_groupe()
        self.cj = make_cj(self.cp, self.groupe, identifiant='CJ001')

    # ── Lecture publique ─────────────────────────────────────────────────────

    def test_list_sites_public(self):
        response = self.client.get('/api/v1/sites/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        noms = [s['nom'] for s in results]
        self.assertIn('BEPANDA INTERNATIONAL', noms)

    def test_retrieve_site_avec_cuves(self):
        response = self.client.get(f'/api/v1/sites/{self.site.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['nom'], 'BEPANDA INTERNATIONAL')
        self.assertEqual(response.data['cuves_count'], 1)
        self.assertEqual(response.data['cuves_principales'][0]['identifiant'], 'CP001')

    def test_list_cuves_principales_filtre_site(self):
        autre = make_site(nom='AUTRE')
        make_cp(autre, identifiant='CP099')
        response = self.client.get(f'/api/v1/cuves-principales/?site={self.site.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        ids = [c['identifiant'] for c in results]
        self.assertEqual(ids, ['CP001'])

    def test_list_cuves_journalieres_filtre_cp(self):
        response = self.client.get(
            f'/api/v1/cuves-journalieres/?cuve_principale={self.cp.id}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if isinstance(response.data, dict) else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['identifiant'], 'CJ001')
        self.assertEqual(results[0]['site_nom'], 'BEPANDA INTERNATIONAL')

    # ── Écriture admin ───────────────────────────────────────────────────────

    def test_create_site_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/v1/sites/',
            {'nom': 'CT AKWA', 'localisation': 'Douala', 'statut': 'actif'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Site.objects.filter(nom='CT AKWA').exists())

    def test_create_site_refuse_anonyme(self):
        response = self.client.post(
            '/api/v1/sites/',
            {'nom': 'INTERDIT', 'localisation': '', 'statut': 'actif'},
            format='json',
        )
        self.assertIn(response.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_create_site_refuse_agent(self):
        self.client.force_authenticate(user=self.agent)
        response = self.client.post(
            '/api/v1/sites/',
            {'nom': 'INTERDIT AGENT', 'localisation': '', 'statut': 'actif'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_cp_format_invalide(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/v1/cuves-principales/',
            {'identifiant': 'MAUVAIS', 'capacite': 1000, 'site': self.site.id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_cp_ok(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/v1/cuves-principales/',
            {'identifiant': 'cp002', 'capacite': 5000, 'site': self.site.id},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['identifiant'], 'CP002')
        self.assertTrue(CuvePrincipale.objects.filter(identifiant='CP002').exists())

    def test_create_groupe_et_cj(self):
        self.client.force_authenticate(user=self.admin)
        g = self.client.post(
            '/api/v1/groupes/',
            {'identifiant': 'G9-TEST-50', 'marque': 'TEST', 'puissance': '50'},
            format='json',
        )
        self.assertEqual(g.status_code, status.HTTP_201_CREATED)

        cj = self.client.post(
            '/api/v1/cuves-journalieres/',
            {
                'identifiant': 'CJ010',
                'capacite': 800,
                'cuve_principale': self.cp.id,
                'groupe_electrogene': g.data['id'],
            },
            format='json',
        )
        self.assertEqual(cj.status_code, status.HTTP_201_CREATED)
        self.assertEqual(cj.data['identifiant'], 'CJ010')
        self.assertEqual(cj.data['groupe_electrogene_identifiant'], 'G9-TEST-50')

    def test_create_cj_format_invalide(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/v1/cuves-journalieres/',
            {
                'identifiant': 'BEPANDA',
                'capacite': 1000,
                'cuve_principale': self.cp.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_site(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/v1/sites/{self.site.id}/',
            {'statut': 'inactif'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.site.refresh_from_db()
        self.assertEqual(self.site.statut, 'inactif')

    def test_delete_site_cascade(self):
        self.client.force_authenticate(user=self.admin)
        # détacher le OneToOne pour éviter PROTECT sur le groupe
        self.cj.groupe_electrogene = None
        self.cj.save()
        response = self.client.delete(f'/api/v1/sites/{self.site.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Site.objects.filter(pk=self.site.id).exists())
        self.assertFalse(CuvePrincipale.objects.filter(pk=self.cp.id).exists())
        self.assertFalse(CuveJournaliere.objects.filter(pk=self.cj.id).exists())
        self.assertTrue(GroupeElectrogene.objects.filter(pk=self.groupe.id).exists())
