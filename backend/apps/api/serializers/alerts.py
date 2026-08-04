# Compatibility layer: re-export serializers from apps.alerts
from apps.alerts.serializers import (
    AlerteListSerializer,
    AlerteTreatmentSerializer,
    TreatAlertSerializer,
)

__all__ = [
    'AlerteListSerializer',
    'AlerteTreatmentSerializer',
    'TreatAlertSerializer',
]
