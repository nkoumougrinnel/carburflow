from django.db.models import Count
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.api.permissions import IsAdminOrReadOnlyAuthenticated

from .models import CuveJournaliere, CuvePrincipale, GroupeElectrogene, Site
from .serializers import (
    CuveJournaliereSerializer,
    CuvePrincipaleSerializer,
    GroupeElectrogeneSerializer,
    SiteListSerializer,
    SiteSerializer,
)


class SiteViewSet(viewsets.ModelViewSet):
    """
    Site = agrégation de cuves principales.
    Lecture ouverte ; écriture réservée aux admins.
    """

    permission_classes = [IsAdminOrReadOnlyAuthenticated]

    def get_queryset(self):
        return (
            Site.objects.annotate(cuves_count_anno=Count('cuves_principales'))
            .prefetch_related('cuves_principales')
            .order_by('nom')
        )

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrReadOnlyAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return SiteListSerializer
        return SiteSerializer


class CuvePrincipaleViewSet(viewsets.ModelViewSet):
    queryset = CuvePrincipale.objects.select_related('site').prefetch_related(
        'cuves_journalieres__groupe_electrogene'
    )
    serializer_class = CuvePrincipaleSerializer
    search_fields = ['identifiant', 'site__nom']

    def get_queryset(self):
        qs = super().get_queryset()
        site_id = self.request.query_params.get('site')
        if site_id:
            qs = qs.filter(site_id=site_id)
        return qs

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrReadOnlyAuthenticated()]


class GroupeElectrogeneViewSet(viewsets.ModelViewSet):
    queryset = GroupeElectrogene.objects.all()
    serializer_class = GroupeElectrogeneSerializer
    search_fields = ['identifiant', 'marque', 'puissance']

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrReadOnlyAuthenticated()]


class CuveJournaliereViewSet(viewsets.ModelViewSet):
    queryset = CuveJournaliere.objects.select_related(
        'cuve_principale__site',
        'groupe_electrogene',
    )
    serializer_class = CuveJournaliereSerializer
    search_fields = ['identifiant', 'cuve_principale__identifiant']

    def get_queryset(self):
        qs = super().get_queryset()
        cp_id = self.request.query_params.get('cuve_principale')
        if cp_id:
            qs = qs.filter(cuve_principale_id=cp_id)
        site_id = self.request.query_params.get('site')
        if site_id:
            qs = qs.filter(cuve_principale__site_id=site_id)
        return qs

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrReadOnlyAuthenticated()]
