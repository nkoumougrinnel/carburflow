from datetime import date
from io import BytesIO

import pytest
from openpyxl import Workbook

from apps.equipment.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene
from apps.reports.ingest import extract_period_from_text, load_rapport_rows_from_bytes
from apps.reports.pipeline import (
    analyze_rapport_rows,
    generate_rapport_template_xlsx,
    import_rapport_lignes,
    resolve_row_entities,
)
from apps.sites.models import Site


def _seed_bepanda():
    site = Site.objects.create(nom='BEPANDA INTERNATIONAL', localisation='Douala', statut='actif')
    cp = CuvePrincipale.objects.create(identifiant='CP001', capacite=40000, site=site)
    groupe = GroupeElectrogene.objects.create(
        identifiant='G1-SDMO-830',
        marque='SDMO',
        puissance='830',
    )
    cj = CuveJournaliere.objects.create(
        identifiant='CJ001',
        capacite=1000,
        cuve_principale=cp,
        groupe_electrogene=groupe,
    )
    return site, cp, cj, groupe


@pytest.mark.django_db
def test_resolve_site_name_and_group_number():
    _site, _cp, cj, groupe = _seed_bepanda()
    row = {
        'id_cuve_principale': 'BEPANDA INTERNATIONAL',
        'id_cuve_journaliere': 'BEPANDA INTERNATIONAL',
        'id_groupe': '1',
    }
    cp, resolved_cj, resolved_g = resolve_row_entities(row)
    assert cp is not None
    assert cp.identifiant == 'CP001'
    assert resolved_cj is not None
    assert resolved_cj.identifiant == cj.identifiant == 'CJ001'
    assert resolved_g is not None
    assert resolved_g.identifiant == groupe.identifiant == 'G1-SDMO-830'


@pytest.mark.django_db
def test_import_terrain_rows_july_20_24():
    _seed_bepanda()
    rows = [
        {
            'date_debut': '20/07/2026',
            'date_fin': '24/07/2026',
            'id_cuve_principale': 'BEPANDA INTERNATIONAL',
            'id_cuve_journaliere': 'BEPANDA INTERNATIONAL',
            'id_groupe': '1',
            'quantités_cuve_principale': '8000',
            'quantite_cuve_journaliere': '900',
            'depotage': '0',
            'compteur_horaire': '1900',
            'état_fonctionnement': 'F',
            'observations': 'RAS',
        }
    ]
    analysis = analyze_rapport_rows(rows)
    assert analysis.ok, [i.message for i in analysis.errors]
    result = import_rapport_lignes(rows, require_entities=True)
    assert result.imported_lines == 1
    assert result.date_debut == '2026-07-20'
    assert result.date_fin == '2026-07-24'


def test_extract_period_from_french_title():
    period = extract_period_from_text(
        'Fiche de suivi des consommations semaine du 20 au 24 juillet 2026'
    )
    assert period == (date(2026, 7, 20), date(2026, 7, 24))


def test_extract_period_from_filename_without_space():
    period = extract_period_from_text('Fiche 06 au 10Juillet 2026.doc')
    assert period == (date(2026, 7, 6), date(2026, 7, 10))


def test_csv_filename_injects_july_20_24_period():
    csv_body = (
        'site;groupe;quantité cp (l);quantite_cuve_journaliere;depotage;compteur_horaire;etat;observations\n'
        'BEPANDA INTERNATIONAL;1;8000;900;0;1900;F;RAS\n'
    )
    rows = load_rapport_rows_from_bytes(
        'fiche 20 au 24 juillet 2026.csv',
        csv_body.encode('utf-8-sig'),
    )
    assert rows
    assert str(rows[0]['date_debut']) in ('2026-07-20', date(2026, 7, 20).isoformat()) or rows[0]['date_debut'] == date(2026, 7, 20)
    assert rows[0]['id_cuve_principale'] == 'BEPANDA INTERNATIONAL'
    assert str(rows[0]['id_groupe']) == '1'


@pytest.mark.django_db
def test_generated_fiche_xlsx_still_imports():
    _seed_bepanda()
    raw = generate_rapport_template_xlsx(date(2026, 7, 20), date(2026, 7, 24))
    rows = load_rapport_rows_from_bytes('carburflow_fiche_hebdo.xlsx', raw)
    assert rows
    # Remplir la première ligne de relevé (mesures vides dans le modèle)
    rows[0]['quantités_cuve_principale'] = 8000
    rows[0]['quantite_cuve_journaliere'] = 900
    rows[0]['compteur_horaire'] = 1900
    analysis = analyze_rapport_rows(rows)
    assert analysis.ok, [i.message for i in analysis.errors]
    result = import_rapport_lignes(rows, require_entities=True)
    assert result.imported_lines >= 1
    assert result.date_debut == '2026-07-20'


@pytest.mark.django_db
def test_docx_table_is_parsed():
    pytest.importorskip('docx')
    from docx import Document

    _seed_bepanda()
    doc = Document()
    doc.add_paragraph('Fiche de suivi semaine du 20 au 24 juillet 2026')
    table = doc.add_table(rows=2, cols=8)
    headers = [
        'Site',
        'Groupe',
        'Quantité CP (L)',
        'Quantité CJ (L)',
        'Dépotage (L)',
        'Compteur Horaire',
        'État (F/P/HS)',
        'Observations',
    ]
    for i, label in enumerate(headers):
        table.rows[0].cells[i].text = label
    values = ['BEPANDA INTERNATIONAL', '1', '8000', '900', '0', '1900', 'F', 'RAS']
    for i, value in enumerate(values):
        table.rows[1].cells[i].text = value
    buffer = BytesIO()
    doc.save(buffer)
    rows = load_rapport_rows_from_bytes('fiche.docx', buffer.getvalue())
    assert len(rows) == 1
    assert rows[0]['id_cuve_principale'] == 'BEPANDA INTERNATIONAL'
    result = import_rapport_lignes(rows, require_entities=True)
    assert result.imported_lines == 1
    assert result.date_debut == '2026-07-20'


def test_xlsx_without_entete_uses_filename_period():
    wb = Workbook()
    ws = wb.active
    ws.title = 'Relevés'
    ws.append(['Site', 'Groupe', 'Quantité CP (L)', 'Quantité CJ (L)', 'Dépotage (L)', 'Compteur Horaire', 'État (F/P/HS)', 'Observations'])
    ws.append(['BEPANDA INTERNATIONAL', '1', 8000, 900, 0, 1900, 'F', 'RAS'])
    buffer = BytesIO()
    wb.save(buffer)
    rows = load_rapport_rows_from_bytes('relevé 20 au 24 juillet 2026.xlsx', buffer.getvalue())
    assert rows
    debut = rows[0]['date_debut']
    assert debut == date(2026, 7, 20) or str(debut) in ('2026-07-20', '20/07/2026')
