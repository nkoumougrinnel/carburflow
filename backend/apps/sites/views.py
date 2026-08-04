from django.db.models import Count
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.api.permissions import IsAdminOrReadOnlyAuthenticated
from apps.equipment.views import (
    CuveJournaliereViewSet,
    CuvePrincipaleViewSet,
    GroupeElectrogeneViewSet,
)

from .models import Site
from .serializers import SiteListSerializer, SiteSerializer


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


