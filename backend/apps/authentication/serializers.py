from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from apps.api.permissions import get_user_role
from apps.sites.models import Site

from .models import ProfilUtilisateur


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    site_id = serializers.SerializerMethodField()
    site_nom = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'site_id',
            'site_nom',
            'is_staff',
        ]

    def get_role(self, obj):
        return get_user_role(obj) or 'user'

    def get_full_name(self, obj):
        name = obj.get_full_name().strip()
        return name or obj.username

    def get_site_id(self, obj):
        profil = getattr(obj, 'profil', None)
        return profil.site_id if profil else None

    def get_site_nom(self, obj):
        profil = getattr(obj, 'profil', None)
        if profil and profil.site_id:
            return profil.site.nom
        return None


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    site_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_username(self, value):
        username = value.strip()
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError('Ce nom d’utilisateur est déjà pris.')
        return username

    def validate_site_id(self, value):
        if value is None:
            return value
        if not Site.objects.filter(pk=value, statut=Site.STATUT_ACTIF).exists():
            raise serializers.ValidationError('Site introuvable ou inactif.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {'password_confirm': 'Les mots de passe ne correspondent pas.'}
            )
        try:
            validate_password(attrs['password'])
        except Exception:
            if len(attrs['password']) < 6:
                raise serializers.ValidationError(
                    {'password': 'Mot de passe trop court (min. 6).'}
                )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        site_id = validated_data.pop('site_id', None)
        user = User(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        user.set_password(password)
        user.save()
        ProfilUtilisateur.objects.create(
            user=user,
            role=ProfilUtilisateur.ROLE_USER,
            site_id=site_id,
        )
        Token.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            username=attrs['username'].strip(),
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError('Identifiants incorrects.')
        if not user.is_active:
            raise serializers.ValidationError('Ce compte est désactivé.')
        attrs['user'] = user
        return attrs


class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    def update(self, instance, validated_data):
        for field in ('first_name', 'last_name', 'email'):
            if field in validated_data:
                value = validated_data[field]
                setattr(
                    instance,
                    field,
                    value.strip() if isinstance(value, str) else value,
                )
        instance.save()
        return instance


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)
    new_password_confirm = serializers.CharField(write_only=True, min_length=6)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError(
                {'current_password': 'Mot de passe actuel incorrect.'}
            )
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError(
                {'new_password_confirm': 'Les mots de passe ne correspondent pas.'}
            )
        try:
            validate_password(attrs['new_password'], user=user)
        except Exception:
            if len(attrs['new_password']) < 6:
                raise serializers.ValidationError(
                    {'new_password': 'Mot de passe trop court (min. 6).'}
                )
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
