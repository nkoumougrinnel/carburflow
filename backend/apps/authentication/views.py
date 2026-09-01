from django.contrib.auth.models import User
from django.db.models import Q
from django.middleware.csrf import get_token
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.permissions import IsAdminRole
from apps.services import auth as auth_service
from .models import ProfilUtilisateur
from .serializers import (
    AdminSetRoleSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)


# (No logic functions here, they are now in apps.services.auth)

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=RegisterSerializer, tags=['Auth'], summary='Inscription')
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(auth_service.build_auth_payload(user), status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=LoginSerializer, tags=['Auth'], summary='Connexion')
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(auth_service.build_auth_payload(serializer.validated_data['user']))


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
        return Response(auth_service.serialize_me(request.user))

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
        return Response(auth_service.serialize_me(request.user))


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
            'user': auth_service.serialize_me(request.user),
        })


class CsrfAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=['Auth'], summary='Jeton CSRF')
    def get(self, request):
        return Response({'csrfToken': get_token(request)})


# PublicSitesAPIView removed — authentication no longer exposes public sites


class AdminStaffUsersAPIView(APIView):
    """Liste des profils privilégiés (admin / agent)."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(tags=['Auth'], summary='Lister admins et agents')
    def get(self, request):
        qs = auth_service.get_staff_users_queryset()[:100]
        return Response([auth_service.serialize_managed_user(user) for user in qs])


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
        return Response([auth_service.serialize_managed_user(user) for user in qs])


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
            auth_service.apply_api_role(user, api_role)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        labels = {
            'admin': 'administrateur',
            'operateur': 'agent / opérateur',
            'user': 'utilisateur',
        }
        return Response({
            'detail': f'Rôle mis à jour : {labels.get(api_role, api_role)}.',
            'user': auth_service.serialize_managed_user(user),
        })
