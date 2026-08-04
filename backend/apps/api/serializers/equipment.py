# Compatibility layer: re-export serializers from apps.equipment
from apps.equipment.serializers import (
    CuveJournaliereSerializer,
    CuvePrincipaleSerializer,
    GroupeElectrogeneSerializer,
)

__all__ = [
    'CuveJournaliereSerializer',
    'CuvePrincipaleSerializer',
    'GroupeElectrogeneSerializer',
]
