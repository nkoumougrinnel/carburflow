# Compatibility layer: re-export serializers from apps.sites
from apps.sites.serializers import (
    CuvePrincipaleNestedSerializer,
    SiteSerializer,
    SiteListSerializer,
)

__all__ = [
    'CuvePrincipaleNestedSerializer',
    'SiteSerializer',
    'SiteListSerializer',
]
