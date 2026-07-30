from django.urls import path

from .views import AlertTreatAPIView, AlertTreatmentsAPIView, AlerteListAPIView

urlpatterns = [
    path('alertes/', AlerteListAPIView.as_view(), name='alertes-list'),
    path('alertes/traitements', AlertTreatmentsAPIView.as_view(), name='alertes-traitements'),
    path('alertes/traiter', AlertTreatAPIView.as_view(), name='alertes-traiter'),
]
