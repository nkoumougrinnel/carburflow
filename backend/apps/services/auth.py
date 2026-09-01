from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework.authtoken.models import Token
from apps.authentication.models import ProfilUtilisateur
from apps.authentication.serializers import UserSerializer
from apps.api.permissions import get_user_role

def ensure_profil(user):
    """Assure que l'utilisateur possède un ProfilUtilisateur."""
    profil = getattr(user, 'profil', None)
    if profil:
        return profil
    role = (
        ProfilUtilisateur.ROLE_ADMIN
        if (user.is_superuser or user.is_staff)
        else ProfilUtilisateur.ROLE_USER
    )
    return ProfilUtilisateur.objects.create(user=user, role=role)

def build_auth_payload(user):
    """Construit le payload de réponse pour login/register."""
    ensure_profil(user)
    user.refresh_from_db()
    token, _ = Token.objects.get_or_create(user=user)
    return {
        'token': token.key,
        'user': UserSerializer(user).data,
    }

def serialize_me(user):
    """Sériallise le profil de l'utilisateur courant."""
    ensure_profil(user)
    user.refresh_from_db()
    data = UserSerializer(user).data
    data['role'] = get_user_role(user)
    return data

def serialize_managed_user(user):
    """Sériallise un utilisateur géré par un admin."""
    ensure_profil(user)
    user.refresh_from_db()
    profil = user.profil
    return {
        **UserSerializer(user).data,
        'role': get_user_role(user),
        'role_db': profil.role,
        'role_label': profil.get_role_display(),
        'is_active': user.is_active,
    }

def apply_api_role(user, api_role):
    """Applique un rôle API (admin/operateur/user) sur le profil + flags Django."""
    profil = ensure_profil(user)
    if profil.role == ProfilUtilisateur.ROLE_SUPER_ADMIN and api_role != 'admin':
        raise ValueError(
            'Impossible de modifier un super administrateur via cette interface.'
        )

    if api_role == 'admin':
        profil.role = ProfilUtilisateur.ROLE_ADMIN
        user.is_staff = True
    elif api_role == 'operateur':
        profil.role = ProfilUtilisateur.ROLE_AGENT
        user.is_staff = False
        user.is_superuser = False
    else:
        profil.role = ProfilUtilisateur.ROLE_USER
        user.is_staff = False
        user.is_superuser = False

    profil.save(update_fields=['role'])
    user.save(update_fields=['is_staff', 'is_superuser'])
    return profil

def get_staff_users_queryset():
    """Admins et agents uniquement (pas les utilisateurs simples)."""
    return (
        User.objects.filter(
            Q(is_superuser=True)
            | Q(is_staff=True)
            | Q(
                profil__role__in=[
                    ProfilUtilisateur.ROLE_SUPER_ADMIN,
                    ProfilUtilisateur.ROLE_ADMIN,
                    ProfilUtilisateur.ROLE_AGENT,
                ]
            )
        )
        .select_related('profil')
        .distinct()
        .order_by('email', 'username')
    )
