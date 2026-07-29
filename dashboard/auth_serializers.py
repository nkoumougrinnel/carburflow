from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.authtoken.models import Token

from dashboard.models import UserProfile
from dashboard.permissions import get_user_role


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

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
            'is_staff',
        ]

    def get_role(self, obj):
        return get_user_role(obj) or UserProfile.ROLE_USER

    def get_full_name(self, obj):
        name = obj.get_full_name().strip()
        return name or obj.username


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_username(self, value):
        username = value.strip()
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError('Ce nom d\u2019utilisateur est déjà pris.')
        return username

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        try:
            validate_password(attrs['password'])
        except Exception:
            if len(attrs['password']) < 6:
                raise serializers.ValidationError({'password': 'Mot de passe trop court (min. 6).'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user, role=UserProfile.ROLE_USER)
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
                setattr(instance, field, validated_data[field].strip() if isinstance(validated_data[field], str) else validated_data[field])
        instance.save()
        return instance


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)
    new_password_confirm = serializers.CharField(write_only=True, min_length=6)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({'current_password': 'Mot de passe actuel incorrect.'})
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({'new_password_confirm': 'Les mots de passe ne correspondent pas.'})
        try:
            validate_password(attrs['new_password'], user=user)
        except Exception:
            if len(attrs['new_password']) < 6:
                raise serializers.ValidationError({'new_password': 'Mot de passe trop court (min. 6).'})
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
