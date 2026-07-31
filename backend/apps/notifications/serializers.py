from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    expediteur_username = serializers.SerializerMethodField()
    expediteur_nom = serializers.SerializerMethodField()
    destinataire_username = serializers.SerializerMethodField()
    destinataire_nom = serializers.SerializerMethodField()
    destinataire_email = serializers.SerializerMethodField()
    alerte_id = serializers.IntegerField(source='alerte.id', read_only=True, allow_null=True)
    alerte_priorite = serializers.CharField(
        source='alerte.priorite',
        read_only=True,
        allow_null=True,
        default=None,
    )
    alerte_type = serializers.CharField(
        source='alerte.type_alerte',
        read_only=True,
        allow_null=True,
        default=None,
    )

    class Meta:
        model = Notification
        fields = [
            'id',
            'sujet',
            'contenu',
            'canal',
            'lu',
            'date_envoi',
            'date_lecture',
            'expediteur',
            'expediteur_username',
            'expediteur_nom',
            'destinataire',
            'destinataire_username',
            'destinataire_nom',
            'destinataire_email',
            'alerte_id',
            'alerte_priorite',
            'alerte_type',
        ]
        read_only_fields = fields

    def get_expediteur_username(self, obj):
        if obj.expediteur_id:
            return obj.expediteur.username
        return None

    def get_expediteur_nom(self, obj):
        if not obj.expediteur_id:
            return 'Système'
        name = obj.expediteur.get_full_name().strip()
        return name or obj.expediteur.username

    def get_destinataire_username(self, obj):
        if obj.destinataire_id:
            return obj.destinataire.username
        return None

    def get_destinataire_nom(self, obj):
        if not obj.destinataire_id:
            return None
        name = obj.destinataire.get_full_name().strip()
        return name or obj.destinataire.username

    def get_destinataire_email(self, obj):
        if not obj.destinataire_id:
            return None
        return obj.destinataire.email or ''


class SendMessageSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    user_id = serializers.IntegerField(required=False, allow_null=True)
    sujet = serializers.CharField(max_length=200, required=False, allow_blank=True, default='Message')
    contenu = serializers.CharField(min_length=1, max_length=5000)

    def validate(self, attrs):
        email = (attrs.get('email') or '').strip()
        user_id = attrs.get('user_id')
        if not email and not user_id:
            raise serializers.ValidationError(
                {'email': 'Indiquez un e-mail ou un identifiant destinataire.'}
            )

        user = None
        if user_id:
            user = User.objects.filter(pk=user_id, is_active=True).first()
            if not user:
                raise serializers.ValidationError({'user_id': 'Destinataire introuvable.'})
        else:
            user = User.objects.filter(email__iexact=email, is_active=True).first()
            if not user:
                raise serializers.ValidationError(
                    {'email': f'Aucun utilisateur actif avec l’e-mail « {email} ».'}
                )

        attrs['destinataire'] = user
        attrs['sujet'] = (attrs.get('sujet') or 'Message').strip()[:200] or 'Message'
        attrs['contenu'] = attrs['contenu'].strip()
        return attrs
