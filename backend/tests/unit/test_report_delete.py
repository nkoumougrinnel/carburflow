from datetime import date

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.authentication.models import ProfilUtilisateur
from apps.reports.models import Rapport
from apps.reports.views import RapportDeleteAPIView


def make_agent(username):
    user = get_user_model().objects.create_user(username=username, password='password')
    ProfilUtilisateur.objects.create(user=user, role=ProfilUtilisateur.ROLE_AGENT)
    return user


@pytest.mark.django_db
def test_agent_can_remove_own_report():
    agent = make_agent('agent-owner')
    rapport = Rapport.objects.create(
        date_debut=date(2026, 8, 24),
        date_fin=date(2026, 8, 30),
        created_by=agent,
    )
    request = APIRequestFactory().delete(f'/api/rapports/{rapport.id}/delete')
    force_authenticate(request, user=agent)

    response = RapportDeleteAPIView.as_view()(request, rapport_id=rapport.id)

    assert response.status_code == 204
    assert not Rapport.objects.filter(pk=rapport.id).exists()


@pytest.mark.django_db
def test_agent_cannot_remove_another_agents_report():
    owner = make_agent('agent-owner-2')
    other_agent = make_agent('agent-other')
    rapport = Rapport.objects.create(
        date_debut=date(2026, 8, 24),
        date_fin=date(2026, 8, 30),
        created_by=owner,
    )
    request = APIRequestFactory().delete(f'/api/rapports/{rapport.id}/delete')
    force_authenticate(request, user=other_agent)

    response = RapportDeleteAPIView.as_view()(request, rapport_id=rapport.id)

    assert response.status_code == 403
    assert Rapport.objects.filter(pk=rapport.id).exists()