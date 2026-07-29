from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CuveJournaliereViewSet,
    CuvePrincipaleViewSet,
    GroupeElectrogeneViewSet,
    SiteViewSet,
)

router = DefaultRouter()
router.register(r'sites', SiteViewSet, basename='site')
router.register(r'cuves-principales', CuvePrincipaleViewSet, basename='cuve-principale')
router.register(r'groupes', GroupeElectrogeneViewSet, basename='groupe-electrogene')
router.register(r'cuves-journalieres', CuveJournaliereViewSet, basename='cuve-journaliere')

urlpatterns = [
    path('', include(router.urls)),
]
