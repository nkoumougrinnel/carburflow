from datetime import date as date_cls

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


# ——————————————————————————————————————————————————————————
#  Textes figés des 5 typologies (grille d'affichage commune)
# ——————————————————————————————————————————————————————————

TITRES_TYPES = {
    'autonomie_critique': 'Autonomie inférieure à 24 h',
    'autonomie_preventive': 'Autonomie inférieure à 36 h',
    'conso_sans_fonctionnement': 'Consommation sans fonctionnement',
    'fonctionnement_sans_consommation': 'Fonctionnement sans consommation',
    'ecart_conso': 'Écart de consommation horaire',
    'compteur_incoherent': 'Compteur horaire incohérent',
}


def _fmt_fr_number(value, digits=1):
    """1234.5 → '1 234,5' (format fr-FR, espace des milliers)."""
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    return f'{value:,.{digits}f}'.replace(',', ' ').replace('.', ',')


def _fmt_heures(value):
    text = _fmt_fr_number(value, 1)
    return f'{text} h' if text is not None else None


def _fmt_litres(value):
    text = _fmt_fr_number(value, 0)
    return f'{text} L' if text is not None else None


def _fmt_taux(value):
    text = _fmt_fr_number(value, 2)
    return f'{text} L/h' if text is not None else None


def _fmt_date_fr(value):
    """'2026-08-31' / date → '31/08/2026'."""
    if not value:
        return None
    if isinstance(value, str):
        try:
            value = date_cls.fromisoformat(value[:10])
        except ValueError:
            return value
    if hasattr(value, 'strftime'):
        return value.strftime('%d/%m/%Y')
    return str(value)


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
        priorite = getattr(obj, 'priorite', None)
        if priorite in PRIORITE_TO_LABEL:
            return PRIORITE_TO_LABEL[priorite]
        # fallback pour les vrais modèles Django
        if hasattr(obj, 'get_priorite_display'):
            return obj.get_priorite_display()
        return priorite

    def get_priority_level(self, obj):
        return PRIORITE_TO_SEVERITY.get(obj.priorite, 'medium')

    def get_severity(self, obj):
        return self.get_priority_level(obj)

    def get_title(self, obj):
        titre = TITRES_TYPES.get(obj.type_alerte)
        if titre:
            return titre
        message = (obj.message or '').strip()
        if not message:
            return obj.get_type_alerte_display()
        return message.split('\n', 1)[0]

    def get_subtitle(self, obj):
        ctx = self._ctx(obj)
        code = obj.type_alerte

        if code in ('autonomie_critique', 'autonomie_preventive'):
            heures = ctx.get('autonomie_heures')
            if heures is None:
                return ''
            parts = [f'Autonomie restante : {_fmt_heures(heures)}.']
            stock = ctx.get('stock_actuel')
            if stock is not None:
                parts.append(f'Stock actuel : {_fmt_litres(stock)}.')
            return ' '.join(parts)

        if code == 'conso_sans_fonctionnement':
            conso = ctx.get('quantite_conso')
            if conso is None:
                return ''
            heures = ctx.get('compteur_horaire') or 0
            return (
                f'Consommation enregistrée : {_fmt_litres(conso)}. '
                f'Temps de fonctionnement : {_fmt_heures(heures)}.'
            )

        if code == 'fonctionnement_sans_consommation':
            heures = ctx.get('compteur_horaire')
            if heures is None:
                return ''
            conso = ctx.get('quantite_conso') or 0
            return (
                f'Temps de fonctionnement : {_fmt_heures(heures)}. '
                f'Consommation enregistrée : {_fmt_litres(conso)}.'
            )

        if code == 'ecart_conso':
            latest = ctx.get('latest_hourly')
            previous = ctx.get('previous_hourly')
            ecart = ctx.get('ecart_pourcent')
            if latest is not None and previous is not None and float(previous) > 0:
                signe = '▲' if float(latest) >= float(previous) else '▼'
                date_courant = _fmt_date_fr(ctx.get('date_rapport_courant'))
                date_ref = _fmt_date_fr(ctx.get('date_rapport_reference'))
                phrase = 'Consommation horaire'
                if date_courant:
                    phrase += f' au {date_courant}'
                phrase += f' : {_fmt_taux(latest)}. Référence'
                if date_ref:
                    phrase += f' au {date_ref}'
                phrase += f' : {_fmt_taux(previous)}.'
                if ecart is not None:
                    phrase += f' Écart : {signe}{_fmt_fr_number(ecart, 1)} %.'
                return phrase
            if ecart is not None:
                return f"Écart : {_fmt_fr_number(ecart, 1)} % (seuil {ctx.get('seuil', 15)}%)."
            return ''

        # Anciens codes : repli sur le message détaillé
        message = (obj.message or '').strip()
        parts = message.split('\n', 1)
        if len(parts) > 1:
            return parts[1].strip()
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
        detection = getattr(obj, 'date_detection', None)
        if detection:
            return detection.isoformat()
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
