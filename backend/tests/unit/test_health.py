import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_api_health_endpoint_is_available():
    client = APIClient()

    response = client.get('/api/v1/health/')

    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
