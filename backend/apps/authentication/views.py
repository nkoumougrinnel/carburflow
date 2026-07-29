from django.middleware.csrf import get_token
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.permissions import get_user_role
from apps.sites.models import Site

from .models import ProfilUtilisateur
from .serializers import (
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
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
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


class PublicSitesAPIView(APIView):
    """Liste légère des sites pour le formulaire d’inscription."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=['Auth'], summary='Sites publics (inscription)')
    def get(self, request):
        sites = Site.objects.filter(statut=Site.STATUT_ACTIF).order_by('nom')
        # Compat frontend SignUp : champ nom_site
        payload = [
            {'id': site.id, 'nom_site': site.nom, 'nom': site.nom}
            for site in sites
        ]
        return Response(payload)
