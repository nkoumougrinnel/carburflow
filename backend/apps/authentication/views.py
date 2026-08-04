from django.contrib.auth.models import User
from django.db.models import Q
from django.middleware.csrf import get_token
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.permissions import IsAdminRole, get_user_role

from .models import ProfilUtilisateur
from .serializers import (
    AdminSetRoleSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)


def ensure_profil(user):
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
    ensure_profil(user)
    user.refresh_from_db()
    token, _ = Token.objects.get_or_create(user=user)
    return {
        'token': token.key,
        'user': UserSerializer(user).data,
    }


def serialize_me(user):
    ensure_profil(user)
    user.refresh_from_db()
    data = UserSerializer(user).data
    data['role'] = get_user_role(user)
    return data


def serialize_managed_user(user):
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


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=RegisterSerializer, tags=['Auth'], summary='Inscription')
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(build_auth_payload(user), status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=LoginSerializer, tags=['Auth'], summary='Connexion')
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(build_auth_payload(serializer.validated_data['user']))


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Auth'], summary='Déconnexion')
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'detail': 'Déconnecté.'})


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer}, tags=['Auth'], summary='Profil courant')
    def get(self, request):
        return Response(serialize_me(request.user))

    @extend_schema(
        request=ProfileUpdateSerializer,
        responses={200: UserSerializer},
        tags=['Auth'],
        summary='Mettre à jour le profil',
    )
    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(serialize_me(request.user))


class PasswordChangeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=PasswordChangeSerializer, tags=['Auth'], summary='Changer le mot de passe')
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        Token.objects.filter(user=request.user).delete()
        token, _ = Token.objects.get_or_create(user=request.user)
        return Response({
            'detail': 'Mot de passe mis à jour.',
            'token': token.key,
            'user': serialize_me(request.user),
        })


class CsrfAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=['Auth'], summary='Jeton CSRF')
    def get(self, request):
        return Response({'csrfToken': get_token(request)})


# PublicSitesAPIView removed — authentication no longer exposes public sites


def staff_users_queryset():
    """Admins et agents uniquement (pas les utilisateurs simples)."""
    from django.db.models import Q

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


class AdminStaffUsersAPIView(APIView):
    """Liste des profils privilégiés (admin / agent)."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(tags=['Auth'], summary='Lister admins et agents')
    def get(self, request):
        qs = staff_users_queryset()[:100]
        return Response([serialize_managed_user(user) for user in qs])


class AdminUserSearchAPIView(APIView):
    """Recherche d’utilisateurs par e-mail ou nom (admin)."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        tags=['Auth'],
        summary='Rechercher un utilisateur par e-mail ou nom',
        parameters=[
            OpenApiParameter(
                name='email',
                description='Fragment d’e-mail, nom ou identifiant',
                required=True,
                type=str,
            ),
        ],
    )
    def get(self, request):
        email = (request.query_params.get('email') or '').strip()
        if len(email) < 2:
            return Response(
                {'detail': 'Indiquez au moins 2 caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = (
            User.objects.filter(
                Q(email__icontains=email)
                | Q(username__icontains=email)
                | Q(first_name__icontains=email)
                | Q(last_name__icontains=email)
            )
            .select_related('profil')
            .order_by('email', 'username')[:20]
        )
        return Response([serialize_managed_user(user) for user in qs])


class AdminSetRoleAPIView(APIView):
    """Élire / rétrograder un utilisateur (admin, agent/opérateur, user)."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        request=AdminSetRoleSerializer,
        tags=['Auth'],
        summary='Attribuer un rôle à un utilisateur',
    )
    def post(self, request):
        serializer = AdminSetRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip()
        api_role = serializer.validated_data['role']

        user = (
            User.objects.filter(email__iexact=email)
            .select_related('profil')
            .first()
        )
        if not user:
            return Response(
                {'detail': f'Aucun utilisateur avec l’e-mail « {email} ».'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if (user.pk == request.user.pk):
            return Response(
                {'detail': 'Vous ne pouvez pas modifier votre propre rôle.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            apply_api_role(user, api_role)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        labels = {
            'admin': 'administrateur',
            'operateur': 'agent / opérateur',
            'user': 'utilisateur',
        }
        return Response({
            'detail': f'Rôle mis à jour : {labels.get(api_role, api_role)}.',
            'user': serialize_managed_user(user),
        })
