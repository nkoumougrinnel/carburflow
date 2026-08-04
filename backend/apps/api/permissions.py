from rest_framework.permissions import BasePermission, SAFE_METHODS

from apps.authentication.models import ProfilUtilisateur


def get_user_role(user):
    """
    Rôle API / frontend :
    - admin (super_admin, admin, staff)
    - operateur (agent terrain)
    - user (consultation)
    """
    if not user or not user.is_authenticated:
        return None

    profil = getattr(user, 'profil', None)
    if profil:
        return profil.role_api

    if user.is_superuser or user.is_staff:
        return 'admin'

    return 'user'


def user_is_admin(user):
    return get_user_role(user) == 'admin'


def user_is_agent(user):
    return get_user_role(user) == 'operateur'


def user_can_upload_rapports(user):
    """Dépôt de relevé réservé aux opérateurs (pas aux responsables)."""
    return get_user_role(user) == 'operateur'


def user_can_access_rapports(user):
    """Consultation des relevés : responsables et opérateurs."""
    return get_user_role(user) in {'admin', 'operateur'}


def user_can_write_referentiel(user):
    return user_is_admin(user)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and user_is_admin(request.user)
        )


class IsAdminOrAgent(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and user_can_access_rapports(request.user)
        )


class IsAdminOrReadOnlyAuthenticated(BasePermission):
    """Admins : tout. Autres authentifiés : lecture seule."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if user_is_admin(request.user):
            return True
        return request.method in SAFE_METHODS
