from rest_framework.permissions import BasePermission, SAFE_METHODS

from dashboard.models import UserProfile


def get_user_role(user):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser or user.is_staff:
        return UserProfile.ROLE_ADMIN
    profile = getattr(user, 'profile', None)
    if profile and profile.role:
        return profile.role
    return UserProfile.ROLE_USER


def user_is_admin(user):
    return get_user_role(user) == UserProfile.ROLE_ADMIN


def user_is_operateur(user):
    return get_user_role(user) == UserProfile.ROLE_OPERATEUR


def user_is_viewer(user):
    return get_user_role(user) == UserProfile.ROLE_USER


def user_can_upload_rapports(user):
    role = get_user_role(user)
    return role in (UserProfile.ROLE_ADMIN, UserProfile.ROLE_OPERATEUR)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and user_is_admin(request.user))


class IsAdminOrOperateur(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and user_can_upload_rapports(request.user)
        )


class IsAdminOrReadOnlyAuthenticated(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if user_is_admin(request.user):
            return True
        return request.method in SAFE_METHODS
