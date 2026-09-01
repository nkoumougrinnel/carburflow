from apps.services.import_validators import validate_lignes_rapport


def test_validate_lignes_rapport_accepts_id_rapport_instead_of_dates():
    rows = [
        {
            'id_rapport': '42',
            'cuve_journaliere': 'CJ001',
            'cuve_principale': 'CP001',
            'groupe': 'G1',
        }
    ]

    result = validate_lignes_rapport(rows)

    assert result.ok
    assert not result.errors


def test_validate_lignes_rapport_requires_id_rapport():
    rows = [
        {
            'cuve_journaliere': 'CJ001',
            'cuve_principale': 'CP001',
            'groupe': 'G1',
        }
    ]

    result = validate_lignes_rapport(rows)

    assert not result.ok
    assert any(issue.field == 'id_rapport' for issue in result.errors)
