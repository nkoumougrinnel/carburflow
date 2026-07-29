from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.api.permissions import IsAdminOrReadOnlyAuthenticated, user_is_admin

from .models import LigneRapport, Rapport
from .serializers import LigneRapportSerializer, RapportListSerializer, RapportSerializer


class RapportViewSet(viewsets.ModelViewSet):
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

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user if user and user.is_authenticated else None)

    def destroy(self, request, *args, **kwargs):
        from rest_framework.response import Response
        from rest_framework import status

        if not user_is_admin(request.user):
            return Response(
                {'detail': 'Seul un responsable peut supprimer un rapport.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class LigneRapportViewSet(viewsets.ModelViewSet):
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
