from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

from dashboard.auth_views import (
    CsrfAPIView,
    LoginAPIView,
    LogoutAPIView,
    MeAPIView,
    PasswordChangeAPIView,
    RegisterAPIView,
)
from dashboard.rapport_views import (
    GenererRapportHebdoAPIView,
    MesRapportsAPIView,
    NormeCsvAPIView,
    NormeMetaAPIView,
    NormeXlsxAPIView,
    RapportDeleteAPIView,
    RapportExportAPIView,
    RapportUploadAPIView,
    SoumissionsAPIView,
)
from dashboard.views import (
    CuvePrincipaleViewSet,
    CuveJournaliereViewSet,
    GroupeElectrogeneViewSet,
    RapportViewSet,
    LigneRapportViewSet,
    SitesDashboardAPIView,
    SitesVolumeAPIView,
    SitesDureeAPIView,
    SitesConsommationAPIView,
    CuvesDashboardAPIView,
    DashboardOverviewAPIView,
    GroupesAPIView,
)

router = DefaultRouter(trailing_slash=False)
router.register(r'cuves_principales', CuvePrincipaleViewSet, basename='cuveprincipale')
router.register(r'cuves_journaliere', CuveJournaliereViewSet, basename='cuvejournaliere')
router.register(r'groupes', GroupeElectrogeneViewSet, basename='groupe-electrogene')
router.register(r'rapports', RapportViewSet, basename='rapport')
router.register(r'lignes_rapport', LigneRapportViewSet, basename='lignerapport')

SpectacularAPIView.permission_classes = [AllowAny]
SpectacularSwaggerView.permission_classes = [AllowAny]
SpectacularRedocView.permission_classes = [AllowAny]

urlpatterns = [
    # --- Auth ---
    path('auth/register', RegisterAPIView.as_view(), name='api-auth-register'),
    path('auth/login', LoginAPIView.as_view(), name='api-auth-login'),
    path('auth/logout', LogoutAPIView.as_view(), name='api-auth-logout'),
    path('auth/me', MeAPIView.as_view(), name='api-auth-me'),
    path('auth/password', PasswordChangeAPIView.as_view(), name='api-auth-password'),
    path('auth/csrf', CsrfAPIView.as_view(), name='api-auth-csrf'),

    # --- Rapports & Upload ---
    path('rapports/norme', NormeMetaAPIView.as_view(), name='api-norme-meta'),
    path('rapports/norme.csv', NormeCsvAPIView.as_view(), name='api-norme-csv'),
    path('rapports/norme.xlsx', NormeXlsxAPIView.as_view(), name='api-norme-xlsx'),
    path('rapports/generer.xlsx', GenererRapportHebdoAPIView.as_view(), name='api-rapports-generer-xlsx'),
    path('rapports/upload', RapportUploadAPIView.as_view(), name='api-rapport-upload'),
    path('rapports/mes', MesRapportsAPIView.as_view(), name='api-rapports-mes'),
    path('rapports/soumissions', SoumissionsAPIView.as_view(), name='api-rapports-soumissions'),
    path(
        'rapports/<int:rapport_id>/export.<str:export_format>',
        RapportExportAPIView.as_view(),
        name='api-rapport-export',
    ),
    path(
        'rapports/<int:rapport_id>/delete',
        RapportDeleteAPIView.as_view(),
        name='api-rapport-delete',
    ),

    # --- Documentation OpenAPI / Swagger ---
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # --- Router REST standard ---
    path('', include(router.urls)),

    # --- Dashboard & Analytics Views ---
    path('dashboard/sites', SitesDashboardAPIView.as_view(), name='dashboard-sites'),
    path('dashboard/sites/volume', SitesVolumeAPIView.as_view(), name='dashboard-sites-volume'),
    path('dashboard/sites/duree', SitesDureeAPIView.as_view(), name='dashboard-sites-duree'),
    path('dashboard/sites/consommation', SitesConsommationAPIView.as_view(), name='dashboard-sites-consommation'),
    path('dashboard/overview', DashboardOverviewAPIView.as_view(), name='dashboard-overview'),
    path('dashboard/groupes', GroupesAPIView.as_view(), name='dashboard-groupes'),
    path('dashboard/cuves', CuvesDashboardAPIView.as_view(), name='dashboard-cuves'),
]