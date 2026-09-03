from datetime import date
from io import BytesIO

import pytest
from openpyxl import Workbook

from apps.equipment.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene
from apps.reports.ingest import load_rapport_rows_from_bytes
from apps.reports.norme import _to_float, extract_period_from_text, rows_from_xlsx
from apps.reports.pipeline import (
    analyze_rapport_rows,
    generate_rapport_template_xlsx,
    import_rapport_lignes,
    resolve_row_entities,
)
from apps.sites.models import Site


def _xlsx_bytes(rows: list[list]) -> bytes:
    wb = Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


@pytest.mark.django_db
def test_resolve_site_and_groupe_numero_vers_cj():
    site = Site.objects.create(nom='BEPANDA INTERNATIONAL')
    cp = CuvePrincipale.objects.create(identifiant='CP001', capacite=40000, site=site)
    groupe = GroupeElectrogene.objects.create(
        identifiant='G1-SDMO-830', marque='SDMO', puissance='830'
    )
    cj = CuveJournaliere.objects.create(
        identifiant='CJ001',
        capacite=1000,
        cuve_principale=cp,
        groupe_electrogene=groupe,
    )

    resolved_cp, resolved_cj, resolved_g = resolve_row_entities(
        'BEPANDA INTERNATIONAL',
        'BEPANDA INTERNATIONAL',
        '1',
    )
    assert resolved_cp == cp
    assert resolved_cj == cj
    assert resolved_g == groupe

    resolved_cp, resolved_cj, resolved_g = resolve_row_entities(
        'BEPANDA INTERNATIONAL',
        None,
        None,
        marque='SDMO',
        puissance='830',
    )
    assert resolved_cp == cp
    assert resolved_cj == cj
    assert resolved_g == groupe


def test_extract_period_from_title_and_filename():
    period = extract_period_from_text(
        'Fiche de suivi des consomations en carburant semaine du 20 au 24 Juillet 2026.xlsx'
    )
    assert period == (date(2026, 7, 20), date(2026, 7, 24))
    period = extract_period_from_text('SEMAINE 20 au 24 juillet 2026 DATE 24 Juillet 2026')
    assert period == (date(2026, 7, 20), date(2026, 7, 24))


def test_to_float_strips_units_and_spaces():
    assert _to_float('19 892 L') == 19892.0
    assert _to_float('1 893 h') == 1893.0
    assert _to_float('—') == 0.0
    assert _to_float('XXX L') == 0.0


def test_camtel_xlsx_skips_title_and_reads_period():
    raw = _xlsx_bytes(
        [
            ['FICHE DU SUIVI HEBDOMADAIRE'],
            ['MOIS / ANNEE', 'Juillet 2026', 'SEMAINE', '20 au 24 Juillet 2026'],
            [
                'N°',
                'Site',
                'Marque du GES',
                'Puissance du GES (kVA)',
                'État de fonctionnement (F/P/HS)',
                'Capacité cuve principale (L)',
                'Capacité cuve journalière (L)',
                'Qté gasoil cuve principale à date (L/cm)',
                'Qté gasoil cuve journalière à date (L/cm)',
                'Compteur(s) horaire(s) à date (H)',
                'Observations',
            ],
            [
                1,
                'BEPANDA INTERNATIONAL',
                'SDMO',
                '830',
                '20 000X2',
                'F',
                '20 000',
                '1 000',
                '19 892 L',
                '1 000 L',
                '1 893 h',
                'RAS',
            ],
        ]
    )
    rows = load_rapport_rows_from_bytes(
        'fiche semaine du 20 au 24 Juillet 2026.xlsx',
        raw,
    )
    assert len(rows) == 1
    row = rows[0]
    assert row['id_cuve_principale'] == 'BEPANDA INTERNATIONAL'
    assert row['marque_groupe'] == 'SDMO'
    assert str(row['puissance_groupe']) == '830'
    assert str(row['état_fonctionnement']).upper() == 'F'
    assert _to_float(row['quantités_cuve_principale']) == 19892.0
    assert _to_float(row['compteur_horaire']) == 1893.0
    assert row['date_debut'] == date(2026, 7, 20)
    assert row['date_fin'] == date(2026, 7, 24)


def test_csv_without_entete_uses_filename_period():
    csv_text = (
        'site;groupe;qte cp;qte cj;compteur horaire\n'
        'BEPANDA INTERNATIONAL;1;8000;900;1900\n'
    )
    rows = load_rapport_rows_from_bytes(
        'relevé 20/07/2026 au 24/07/2026.csv',
        csv_text.encode('utf-8'),
    )
    assert len(rows) == 1
    assert rows[0]['date_debut'] == date(2026, 7, 20)
    assert rows[0]['date_fin'] == date(2026, 7, 24)
    assert rows[0]['id_groupe'] in ('1', 1)


@pytest.mark.django_db
def test_generated_template_still_analyzes():
    site = Site.objects.create(nom='BEPANDA INTERNATIONAL')
    cp = CuvePrincipale.objects.create(identifiant='CP001', capacite=40000, site=site)
    groupe = GroupeElectrogene.objects.create(
        identifiant='G1-SDMO-830', marque='SDMO', puissance='830'
    )
    CuveJournaliere.objects.create(
        identifiant='CJ001',
        capacite=1000,
        cuve_principale=cp,
        groupe_electrogene=groupe,
    )
    raw = generate_rapport_template_xlsx(date(2026, 7, 20), date(2026, 7, 24))
    rows = rows_from_xlsx(raw)
    analysis = analyze_rapport_rows(rows)
    assert analysis.ok
    assert analysis.date_debut == '2026-07-20'
    assert analysis.date_fin == '2026-07-24'
    assert analysis.new_cuves_journalieres == []
    assert analysis.known_cuves_journalieres


@pytest.mark.django_db
def test_import_maps_terrain_names_to_codes():
    site = Site.objects.create(nom='BEPANDA INTERNATIONAL')
    cp = CuvePrincipale.objects.create(identifiant='CP001', capacite=40000, site=site)
    groupe = GroupeElectrogene.objects.create(
        identifiant='G1-SDMO-830', marque='SDMO', puissance='830'
    )
    CuveJournaliere.objects.create(
        identifiant='CJ001',
        capacite=1000,
        cuve_principale=cp,
        groupe_electrogene=groupe,
    )
    result = import_rapport_lignes(
        [
            {
                'date_debut': date(2026, 7, 20),
                'date_fin': date(2026, 7, 24),
                'id_cuve_principale': 'BEPANDA INTERNATIONAL',
                'id_cuve_journaliere': 'BEPANDA INTERNATIONAL',
                'id_groupe': '1',
                'quantités_cuve_principale': 8000,
                'quantite_cuve_journaliere': 900,
                'compteur_horaire': 1900,
                'état_fonctionnement': 'F',
            }
        ]
    )
    assert result.imported_lines == 1
    assert result.date_debut == '2026-07-20'


@pytest.mark.django_db
def test_sdm0_typo_and_huile_row_are_handled_automatically():
    site = Site.objects.create(nom='BEPANDA NATIONAL')
    cp = CuvePrincipale.objects.create(identifiant='CP002', capacite=5000, site=site)
    g2 = GroupeElectrogene.objects.create(identifiant='G2-SDMO-650', marque='SDMO', puissance='650')
    g3 = GroupeElectrogene.objects.create(identifiant='G3-DEUTZ-450', marque='DEUTZ', puissance='450')
    CuveJournaliere.objects.create(
        identifiant='CJ002', capacite=1000, cuve_principale=cp, groupe_electrogene=g2
    )
    CuveJournaliere.objects.create(
        identifiant='CJ003', capacite=1000, cuve_principale=cp, groupe_electrogene=g3
    )

    raw = _xlsx_bytes(
        [
            ['Fiche semaine du 20 au 24 Juillet 2026'],
            [
                'N°',
                'Site',
                'Marque du GES',
                'Puissance du GES (kVA)',
                'État de fonctionnement (F/P/HS)',
                'Qté gasoil cuve principale à date (L/cm)',
                'Qté gasoil cuve journalière à date (L/cm)',
                'Compteur(s) horaire(s) à date (H)',
            ],
            [1, 'BEPANDA NATIONAL 1', 'SDM0', '650', 'F', '4 094 L', '1 000 L', '1 018 h'],
            ["Quantité (L) ou nombre de fûts d'huile 15W40", None, None, '00 Litre en stock'],
        ]
    )
    rows = load_rapport_rows_from_bytes(
        'fiche semaine du 20 au 24 Juillet 2026.xlsx',
        raw,
    )
    result = import_rapport_lignes(rows)
    assert result.imported_lines == 1
    from apps.reports.models import LigneRapport

    ligne = LigneRapport.objects.get(rapport_id=result.rapport_id)
    assert ligne.cuve_principale.identifiant == 'CP002'
    assert ligne.cuve_journaliere.identifiant == 'CJ002'
    assert ligne.groupe_electrogene.identifiant == 'G2-SDMO-650'
