from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from dashboard.auth_serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)
from dashboard.models import UserProfile
from dashboard.permissions import get_user_role


def ensure_profile(user):
    if hasattr(user, 'profile'):
        return user.profile
    role = UserProfile.ROLE_ADMIN if (user.is_superuser or user.is_staff) else UserProfile.ROLE_USER
    return UserProfile.objects.create(user=user, role=role)


def build_auth_payload(user):
    ensure_profile(user)
    user.refresh_from_db()
    token, _ = Token.objects.get_or_create(user=user)
    return {
        'token': token.key,
        'user': UserSerializer(user).data,
    }


def serialize_me(user):
    ensure_profile(user)
    user.refresh_from_db()
    data = UserSerializer(user).data
    data['role'] = get_user_role(user)
    return data


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=RegisterSerializer, tags=['Auth'], summary='Inscription utilisateur')
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

    @extend_schema(request=ProfileUpdateSerializer, responses={200: UserSerializer}, tags=['Auth'], summary='Mettre à jour le profil')
    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.update(request.user, serializer.validated_data)
        return Response(serialize_me(request.user))


class PasswordChangeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=PasswordChangeSerializer, tags=['Auth'], summary='Changer le mot de passe')
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Invalider les autres sessions éventuelles : régénérer le token courant
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
