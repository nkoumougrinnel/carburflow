from rest_framework import serializers

from .models import Alerte


class AlerteTreatmentSerializer(serializers.ModelSerializer):
    traite_par_username = serializers.SerializerMethodField()

    class Meta:
        model = Alerte
        fields = (
            'id',
            'cle',
            'etat',
            'justification',
            'message',
            'priorite',
            'type_alerte',
            'date_traitement',
            'traite_par',
            'traite_par_username',
            'site',
            'groupe_electrogene',
        )

    def get_traite_par_username(self, obj):
        user = obj.traite_par
        return user.username if user else None


class TreatAlertSerializer(serializers.Serializer):
    cle = serializers.CharField(max_length=120)
    justification = serializers.CharField(min_length=5, max_length=2000)
    title = serializers.CharField(required=False, allow_blank=True, max_length=500)
    subtitle = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    type = serializers.CharField(required=False, allow_blank=True, max_length=50)
    severity = serializers.CharField(required=False, allow_blank=True, max_length=20)
    site_id = serializers.IntegerField(required=False, allow_null=True)
    group_id = serializers.IntegerField(required=False, allow_null=True)
