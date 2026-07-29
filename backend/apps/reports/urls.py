from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .rapport_views import (
    GenererRapportHebdoAPIView,
    MesRapportsAPIView,
    NormeCsvAPIView,
    NormeMetaAPIView,
    NormeXlsxAPIView,
    RapportExportAPIView,
    RapportUploadAPIView,
    SoumissionsAPIView,
)
from .views import LigneRapportViewSet, RapportViewSet

router = DefaultRouter()
router.register(r'rapports', RapportViewSet, basename='rapport')
router.register(r'lignes-rapport', LigneRapportViewSet, basename='ligne-rapport')

urlpatterns = [
    # Routes métier import / norme — avant le router (évite conflit pk=norme, etc.)
    path('rapports/norme', NormeMetaAPIView.as_view(), name='api-norme-meta'),
    path('rapports/norme.csv', NormeCsvAPIView.as_view(), name='api-norme-csv'),
    path('rapports/norme.xlsx', NormeXlsxAPIView.as_view(), name='api-norme-xlsx'),
    path(
        'rapports/generer.xlsx',
        GenererRapportHebdoAPIView.as_view(),
        name='api-rapports-generer-xlsx',
    ),
    path('rapports/upload', RapportUploadAPIView.as_view(), name='api-rapport-upload'),
    path('rapports/mes', MesRapportsAPIView.as_view(), name='api-rapports-mes'),
    path(
        'rapports/soumissions',
        SoumissionsAPIView.as_view(),
        name='api-rapports-soumissions',
    ),
    path(
        'rapports/<int:rapport_id>/export.<str:export_format>',
        RapportExportAPIView.as_view(),
        name='api-rapport-export',
    ),
    path('', include(router.urls)),
]
