from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.api.permissions import IsAdminOrReadOnlyAuthenticated

from .models import LigneRapport, Rapport
from .serializers import LigneRapportSerializer, RapportListSerializer, RapportSerializer


class RapportViewSet(viewsets.ReadOnlyModelViewSet):
    """Lecture seule — pas de modification ni suppression de rapports."""

    queryset = Rapport.objects.select_related('created_by').prefetch_related('lignes').all()
    permission_classes = [IsAdminOrReadOnlyAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return RapportListSerializer
        return RapportSerializer

    def get_queryset(self):
        return (
            Rapport.objects.select_related('created_by')
            .prefetch_related('lignes')
            .order_by('date_debut', 'date_fin', 'id')
        )

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrReadOnlyAuthenticated()]


class LigneRapportViewSet(viewsets.ReadOnlyModelViewSet):
    """Lecture seule des lignes de rapport."""

    queryset = LigneRapport.objects.select_related(
        'rapport',
        'cuve_principale',
        'cuve_journaliere',
        'groupe_electrogene',
    )
    serializer_class = LigneRapportSerializer

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrReadOnlyAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        rapport_id = self.request.query_params.get('rapport')
        if rapport_id:
            qs = qs.filter(rapport_id=rapport_id)
        return qs
