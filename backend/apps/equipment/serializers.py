from rest_framework import serializers

from .models import CuveJournaliere, CuvePrincipale, GroupeElectrogene, validate_cj_identifiant, validate_cp_identifiant


class GroupeElectrogeneSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupeElectrogene
        fields = [
            'id',
            'identifiant',
            'marque',
            'puissance',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CuveJournaliereSerializer(serializers.ModelSerializer):
    cuve_principale_identifiant = serializers.CharField(
        source='cuve_principale.identifiant',
        read_only=True,
    )
    groupe_electrogene_identifiant = serializers.CharField(
        source='groupe_electrogene.identifiant',
        read_only=True,
    )
    site_id = serializers.IntegerField(
        source='cuve_principale.site_id',
        read_only=True,
    )
    site_nom = serializers.CharField(
        source='cuve_principale.site.nom',
        read_only=True,
    )
    latest_volume = serializers.SerializerMethodField()
    latest_volume_date = serializers.SerializerMethodField()

    class Meta:
        model = CuveJournaliere
        fields = [
            'id',
            'identifiant',
            'capacite',
            'cuve_principale',
            'cuve_principale_identifiant',
            'groupe_electrogene',
            'groupe_electrogene_identifiant',
            'site_id',
            'site_nom',
            'latest_volume',
            'latest_volume_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'latest_volume', 'latest_volume_date']

    def get_latest_volume(self, obj):
        """
        Volume réel de la CJ = dernière valeur non nulle
        de quantite_gasoil_cuve_journaliere relevée sur les lignes de rapport.
        """
        from apps.reports.models import LigneRapport
        last_line = (
            LigneRapport.objects
            .filter(cuve_journaliere_id=obj.id)
            .exclude(quantite_gasoil_cuve_journaliere__isnull=True)
            .select_related('rapport')
            .order_by('-rapport__date_fin', '-rapport__id')
            .first()
        )
        if last_line is None:
            return None
        value = last_line.quantite_gasoil_cuve_journaliere
        if value is None or float(value) <= 0:
            return None
        return round(float(value), 1)

    def get_latest_volume_date(self, obj):
        from apps.reports.models import LigneRapport
        last_line = (
            LigneRapport.objects
            .filter(cuve_journaliere_id=obj.id)
            .exclude(quantite_gasoil_cuve_journaliere__isnull=True)
            .select_related('rapport')
            .order_by('-rapport__date_fin', '-rapport__id')
            .first()
        )
        if last_line is None or not getattr(last_line, 'rapport', None):
            return None
        return last_line.rapport.date_fin.isoformat() if last_line.rapport.date_fin else None

    def validate_identifiant(self, value):
        value = str(value).strip().upper()
        validate_cj_identifiant(value)
        return value


class CuvePrincipaleSerializer(serializers.ModelSerializer):
    site_nom = serializers.CharField(source='site.nom', read_only=True)
    cuves_journalieres = CuveJournaliereSerializer(many=True, read_only=True)
    latest_volume = serializers.SerializerMethodField()
    latest_volume_date = serializers.SerializerMethodField()

    class Meta:
        model = CuvePrincipale
        fields = [
            'id',
            'identifiant',
            'capacite',
            'site',
            'site_nom',
            'cuves_journalieres',
            'latest_volume',
            'latest_volume_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'latest_volume', 'latest_volume_date']

    def get_latest_volume(self, obj):
        from apps.reports.models import LigneRapport
        last_line = (
            LigneRapport.objects
            .filter(cuve_principale_id=obj.id)
            .exclude(quantite_gasoil_cuve_principale__isnull=True)
            .select_related('rapport')
            .order_by('-rapport__date_fin', '-rapport__id')
            .first()
        )
        if last_line is None:
            return None
        value = last_line.quantite_gasoil_cuve_principale
        if value is None or float(value) <= 0:
            return None
        return round(float(value), 1)

    def get_latest_volume_date(self, obj):
        from apps.reports.models import LigneRapport
        last_line = (
            LigneRapport.objects
            .filter(cuve_principale_id=obj.id)
            .exclude(quantite_gasoil_cuve_principale__isnull=True)
            .select_related('rapport')
            .order_by('-rapport__date_fin', '-rapport__id')
            .first()
        )
        if last_line is None or not getattr(last_line, 'rapport', None):
            return None
        return last_line.rapport.date_fin.isoformat() if last_line.rapport.date_fin else None

    def validate_identifiant(self, value):
        value = str(value).strip().upper()
        validate_cp_identifiant(value)
        return value
