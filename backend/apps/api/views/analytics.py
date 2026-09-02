"""
Vues API Analytics — couche fine de coordination.

Chaque vue délègue à AnalyticsService et retourne directement la Response.
Les URL paths restent identiques (/api/dashboard/…) pour compatibilité frontend.
"""

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.services.analytics import AnalyticsService


# ─── Niveau 1 : Système (vue d'ensemble) ────────────────────────────────────

class SystemOverviewAPIView(APIView):
    """Synthèse globale : sites critiques, anomalies, alertes."""

    def get(self, request):
        return Response(AnalyticsService.get_system_overview())


# ─── Niveau 2 : Sites (séries volume / conso / heures) ──────────────────────

class SiteAnalyticsAPIView(APIView):
    """Séries de données par site : volume, consommation, heures, autonomie."""

    def get(self, request):
        site_id_param = request.query_params.get('siteId') or request.query_params.get('site')

        site_id = None
        if site_id_param:
            try:
                site_id = int(site_id_param)
            except (ValueError, TypeError):
                pass

        return Response(AnalyticsService.get_site_analytics(site_id))


# ─── Niveau 3 : Équipements (groupes électrogènes) ──────────────────────────

class EquipmentAnalyticsAPIView(APIView):
    """Données détaillées par groupe électrogène avec filtrage par site."""

    def get(self, request):
        site_id_param = request.query_params.get('site_id')
        return Response(
            AnalyticsService.get_equipment_analytics(site_id_param=site_id_param)
        )


# ─── Endpoints dynamiques pour les filtres ────────────────────────────────

class SitesDateRangeAPIView(APIView):
    """
    Calcule dynamiquement les bornes temporelles min/max des relevés.
    Si ?site_id= est fourni, les bornes sont restreintes à ce site.
    Renvoie min_date/max_date=null si aucun relevé n'existe.
    """

    def get(self, request):
        site_id_param = request.query_params.get('site_id')
        site_id = None
        if site_id_param:
            try:
                site_id = int(site_id_param)
            except (ValueError, TypeError):
                site_id = None
        return Response(AnalyticsService.get_date_range(site_id))


class SitesListAPIView(APIView):
    """
    Liste tous les sites (cuves principales) depuis la base de données.
    Aucun fallback hardcodé.
    """

    def get(self, request):
        return Response({'sites': AnalyticsService.list_sites()})


# ─── Alias de compatibilité ─────────────────────────────────────────────────
# Permettent aux imports existants (urls.py, tests) de continuer à fonctionner.

DashboardOverviewAPIView = SystemOverviewAPIView
SitesDashboardAPIView = SiteAnalyticsAPIView
GroupesAPIView = EquipmentAnalyticsAPIView

# CuvesDashboardAPIView est fusionnée dans SiteAnalyticsAPIView.
# On garde l'alias pour ne pas casser les imports existants.
CuvesDashboardAPIView = SiteAnalyticsAPIView
