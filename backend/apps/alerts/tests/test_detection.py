import datetime

import pytest

from django.contrib.auth import get_user_model

from apps.alerts.models import Alerte
from apps.alerts.services.detection import detecter_et_persister_alertes
from apps.reports.models import LigneRapport, Rapport
from apps.sites.models import Site
from apps.equipment.models import CuvePrincipale, CuveJournaliere, GroupeElectrogene


@pytest.mark.django_db
def test_detecter_et_persister_alertes_creates_alerts_from_report_data():
    user = get_user_model().objects.create_user(
        username='testuser',
        password='testpass',
    )

    site = Site.objects.create(nom='Site A', localisation='Test', statut='actif')
    cuve_principale = CuvePrincipale.objects.create(
        identifiant='CP001', capacite=1000.0, site=site
    )
    groupe = GroupeElectrogene.objects.create(
        identifiant='G001', marque='Marque', puissance='100kW')
    cuve_journaliere = CuveJournaliere.objects.create(
        identifiant='CJ001', capacite=500.0, cuve_principale=cuve_principale, groupe_electrogene=groupe
    )

    rapport1 = Rapport.objects.create(
        date_debut=datetime.date(2026, 7, 1),
        date_fin=datetime.date(2026, 7, 7),
        created_by=user,
    )
    Rapport.objects.create(
        date_debut=datetime.date(2026, 7, 8),
        date_fin=datetime.date(2026, 7, 14),
        created_by=user,
    )

    LigneRapport.objects.create(
        rapport=rapport1,
        cuve_principale=cuve_principale,
        cuve_journaliere=cuve_journaliere,
        groupe_electrogene=groupe,
        quantite_gasoil_cuve_principale=100.0,
        quantite_gasoil_cuve_journaliere=50.0,
        compteur_horaire=0.0,
    )
    LigneRapport.objects.create(
        rapport=Rapport.objects.get(date_fin=datetime.date(2026, 7, 14)),
        cuve_principale=cuve_principale,
        cuve_journaliere=cuve_journaliere,
        groupe_electrogene=groupe,
        quantite_gasoil_cuve_principale=100.0,
        quantite_gasoil_cuve_journaliere=50.0,
        compteur_horaire=1.0,
    )

    result = detecter_et_persister_alertes()

    assert result['created'] >= 0
    assert result['updated'] >= 0
    assert result['ignored'] >= 0

    alertes = list(Alerte.objects.all())
    print('DEBUG ALERTS', [(alerte.type_alerte, alerte.date_apparition, alerte.cle) for alerte in alertes])
    assert alertes, 'Aucune alerte créée'
    assert all(
        alerte.date_apparition == datetime.date(2026, 7, 14)
        for alerte in alertes
    )


@pytest.mark.django_db
def test_detecter_et_persister_alertes_creates_distinct_repeat_alerts_by_report():
    user = get_user_model().objects.create_user(
        username='testuser2',
        password='testpass',
    )

    site = Site.objects.create(nom='Site B', localisation='Test', statut='actif')
    cuve_principale = CuvePrincipale.objects.create(
        identifiant='CP002', capacite=1000.0, site=site
    )
    groupe = GroupeElectrogene.objects.create(
        identifiant='G002', marque='Marque', puissance='100kW')
    cuve_journaliere = CuveJournaliere.objects.create(
        identifiant='CJ002', capacite=500.0, cuve_principale=cuve_principale, groupe_electrogene=groupe
    )

    rapport1 = Rapport.objects.create(
        date_debut=datetime.date(2026, 7, 1),
        date_fin=datetime.date(2026, 7, 7),
        created_by=user,
    )
    rapport2 = Rapport.objects.create(
        date_debut=datetime.date(2026, 7, 8),
        date_fin=datetime.date(2026, 7, 14),
        created_by=user,
    )

    LigneRapport.objects.create(
        rapport=rapport1,
        cuve_principale=cuve_principale,
        cuve_journaliere=cuve_journaliere,
        groupe_electrogene=groupe,
        quantite_gasoil_cuve_principale=100.0,
        quantite_gasoil_cuve_journaliere=50.0,
        compteur_horaire=0.0,
    )
    LigneRapport.objects.create(
        rapport=rapport2,
        cuve_principale=cuve_principale,
        cuve_journaliere=cuve_journaliere,
        groupe_electrogene=groupe,
        quantite_gasoil_cuve_principale=100.0,
        quantite_gasoil_cuve_journaliere=50.0,
        compteur_horaire=0.0,
    )

    result = detecter_et_persister_alertes()

    alertes = list(Alerte.objects.filter(type_alerte='conso_sans_horaire'))
    assert len(alertes) == 2
    assert {alerte.cle for alerte in alertes} == {
        f'groupe-{groupe.id}-conso_sans_horaire-{rapport1.id}',
        f'groupe-{groupe.id}-conso_sans_horaire-{rapport2.id}',
    }
    assert {alerte.date_apparition for alerte in alertes} == {rapport1.date_fin, rapport2.date_fin}
