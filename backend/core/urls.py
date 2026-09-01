"""URL racine — API v1 (nouvelle architecture)."""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    # Compatibilité legacy et route documentaire /api/v1
    path('api/', include('apps.api.urls')),
    path('api/v1/', include('apps.api.urls')),
    path('api/', include('apps.notifications.urls')),
    path('api/v1/', include('apps.notifications.urls')),
]
