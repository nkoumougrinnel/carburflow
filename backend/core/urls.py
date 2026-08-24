"""URL racine — API v1 (nouvelle architecture)."""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.api.urls')),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/', include('apps.alerts.urls')),
    path('api/', include('apps.notifications.urls')),
]
