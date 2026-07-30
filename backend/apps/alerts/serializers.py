from rest_framework import serializers

from .models import Alerte

# Mapping priorité métier → classe visuelle UI
PRIORITE_TO_SEVERITY = {
    'critique': 'critical',
    'haute': 'high',
    'moyenne': 'medium',
    'basse': 'low',
}

PRIORITE_TO_LABEL = {
    'critique': 'Critique',
    'haute': 'Haute',
    'moyenne': 'Moyenne',
    'basse': 'Basse',
}


class AlerteListSerializer(serializers.ModelSerializer):
    """Format consommable par le dashboard / page Alertes."""

    id = serializers.SerializerMethodField()
    db_id = serializers.IntegerField(source='pk', read_only=True)
    type = serializers.CharField(source='type_alerte', read_only=True)
    priority = serializers.SerializerMethodField()
    priority_level = serializers.SerializerMethodField()
    severity = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    subtitle = serializers.SerializerMethodField()
    site_id = serializers.SerializerMethodField()
    site_name = serializers.SerializerMethodField()
    group_id = serializers.SerializerMethodField()
    group_label = serializers.SerializerMethodField()
    target = serializers.SerializerMethodField()
    detected_at = serializers.SerializerMethodField()
    traitee = serializers.SerializerMethodField()
    traite_par_username = serializers.SerializerMethodField()
    ecart_pct = serializers.SerializerMethodField()

    class Meta:
        model = Alerte
        fields = (
            'id',
            'db_id',
            'cle',
            'type',
            'type_alerte',
            'priority',
            'priorite',
            'priority_level',
            'severity',
            'title',
            'subtitle',
            'message',
            'etat',
            'traitee',
            'justification',
            'date_traitement',
            'traite_par',
            'traite_par_username',
            'site_id',
            'site_name',
            'group_id',
            'group_label',
            'target',
            'detected_at',
            'date_apparition',
            'ecart_pct',
            'donnees_contexte',
        )

    def _ctx(self, obj):
        return obj.donnees_contexte or {}

    def get_id(self, obj):
        return obj.cle or f'alerte-{obj.pk}'

    def get_priority(self, obj):
        return PRIORITE_TO_LABEL.get(obj.priorite, obj.get_priorite_display())

    def get_priority_level(self, obj):
        return PRIORITE_TO_SEVERITY.get(obj.priorite, 'medium')

    def get_severity(self, obj):
        return self.get_priority_level(obj)

    def get_title(self, obj):
        message = (obj.message or '').strip()
        if not message:
            return obj.get_type_alerte_display()
        return message.split('\n', 1)[0]

    def get_subtitle(self, obj):
        message = (obj.message or '').strip()
        parts = message.split('\n', 1)
        if len(parts) > 1:
            return parts[1].strip()
        ctx = self._ctx(obj)
        if obj.type_alerte == 'ecart_conso' and ctx.get('ecart_pourcent') is not None:
            return (
                f"Écart : {ctx['ecart_pourcent']}% "
                f"(seuil {ctx.get('seuil', 15)}%)"
            )
        if obj.type_alerte in ('autonomie_critique', 'autonomie_preventive'):
            heures = ctx.get('autonomie_heures')
            if heures is not None:
                return f'Autonomie restante : {heures}h'
        if obj.type_alerte == 'conso_sans_horaire':
            conso = ctx.get('quantite_conso')
            if conso is not None:
                return f'Consommation relevée : {conso} L — delta horaire manquant.'
        return ''

    def get_site_id(self, obj):
        ctx = self._ctx(obj)
        if ctx.get('cuve_principale_id') is not None:
            return ctx['cuve_principale_id']
        return obj.site_id

    def get_site_name(self, obj):
        ctx = self._ctx(obj)
        if ctx.get('site_name'):
            return ctx['site_name']
        if obj.site_id and getattr(obj.site, 'nom', None):
            return obj.site.nom
        return ''

    def get_group_id(self, obj):
        ctx = self._ctx(obj)
        if ctx.get('groupe_id') is not None:
            return ctx['groupe_id']
        return obj.groupe_electrogene_id

    def get_group_label(self, obj):
        ctx = self._ctx(obj)
        if ctx.get('groupe_label'):
            return ctx['groupe_label']
        if obj.groupe_electrogene_id:
            return obj.groupe_electrogene.identifiant
        return ''

    def get_target(self, obj):
        if obj.groupe_electrogene_id or self._ctx(obj).get('groupe_id'):
            return 'groups'
        return 'site'

    def get_detected_at(self, obj):
        if obj.date_apparition:
            return obj.date_apparition.isoformat()
        return None

    def get_traitee(self, obj):
        return obj.etat == 'traitee'

    def get_traite_par_username(self, obj):
        user = obj.traite_par
        return user.username if user else None

    def get_ecart_pct(self, obj):
        ctx = self._ctx(obj)
        value = ctx.get('ecart_pourcent')
        return float(value) if value is not None else None


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
