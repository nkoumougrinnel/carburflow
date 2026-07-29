"""URL racine — API v1 (nouvelle architecture)."""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.api.v1.urls')),
]
