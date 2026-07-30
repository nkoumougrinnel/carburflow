"""Routage API v1 CarburFlow."""
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.api.dashboard_views import (
    CuvesDashboardAPIView,
    DashboardOverviewAPIView,
    GroupesAPIView,
    SitesDashboardAPIView,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return Response({'status': 'ok', 'api': 'v1'})


urlpatterns = [
    path('health/', health, name='api-v1-health'),
    path('auth/', include('apps.authentication.urls')),
    path('', include('apps.sites.urls')),
    path('', include('apps.reports.urls')),
    path('', include('apps.alerts.urls')),
    path('', include('apps.notifications.urls')),
    # Dashboard analytique (payloads compatibles frontend)
    path('dashboard/sites', SitesDashboardAPIView.as_view(), name='dashboard-sites'),
    path('dashboard/overview', DashboardOverviewAPIView.as_view(), name='dashboard-overview'),
    path('dashboard/groupes', GroupesAPIView.as_view(), name='dashboard-groupes'),
    path('dashboard/cuves', CuvesDashboardAPIView.as_view(), name='dashboard-cuves'),
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
