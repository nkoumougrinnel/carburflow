# Compatibility layer: re-export serializers from apps.reports
from apps.reports.serializers import (
    LigneRapportSerializer,
    RapportSerializer,
    RapportListSerializer,
)

__all__ = [
    'LigneRapportSerializer',
    'RapportSerializer',
    'RapportListSerializer',
]
