from datetime import date

import pytest
from django.db import connection

from apps.imports.utils import synchronize_sequence
from apps.alerts.models import Alerte
from apps.reports.pipeline import delete_rapport_and_orphans
from apps.reports.models import Rapport


@pytest.mark.django_db
def test_synchronize_sequence_avoids_rapport_primary_key_collision():
    Rapport.objects.create(
        id=1,
        date_debut=date(2026, 8, 24),
        date_fin=date(2026, 8, 30),
    )

    with connection.cursor() as cursor:
        cursor.execute("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'rapport'")

    synchronize_sequence(Rapport)

    rapport = Rapport.objects.create(
        date_debut=date(2026, 8, 31),
        date_fin=date(2026, 9, 6),
    )

    assert rapport.id == 2


@pytest.mark.django_db
def test_deleting_report_removes_its_alerts_only():
    rapport = Rapport.objects.create(
        date_debut=date(2026, 8, 24),
        date_fin=date(2026, 8, 30),
    )
    other_rapport = Rapport.objects.create(
        date_debut=date(2026, 8, 31),
        date_fin=date(2026, 9, 6),
    )
    Alerte.objects.create(
        cle='rapport-1-alert',
        message='Alerte du rapport à retirer',
        donnees_contexte={'rapport_id': rapport.id},
    )
    Alerte.objects.create(
        cle='rapport-2-alert',
        message='Alerte à conserver',
        donnees_contexte={'rapport_id': other_rapport.id},
    )

    delete_rapport_and_orphans(rapport)

    assert not Alerte.objects.filter(cle='rapport-1-alert').exists()
    assert Alerte.objects.filter(cle='rapport-2-alert').exists()