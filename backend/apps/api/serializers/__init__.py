"""Central API serializers façade.
Import specific serializer modules from apps.sites, apps.equipment, apps.reports
so callers can use `from apps.api.serializers import sites`.
"""
from . import sites, equipment, reports, alerts  # re-export modules
__all__ = ["sites", "equipment", "reports", "alerts"]
