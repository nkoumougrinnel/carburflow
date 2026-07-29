from rest_framework import serializers

from .models import (
    CuveJournaliere,
    CuvePrincipale,
    GroupeElectrogene,
    Site,
    validate_cj_identifiant,
    validate_cp_identifiant,
)


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
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_identifiant(self, value):
        value = str(value).strip().upper()
        validate_cj_identifiant(value)
        return value


class CuvePrincipaleSerializer(serializers.ModelSerializer):
    site_nom = serializers.CharField(source='site.nom', read_only=True)
    cuves_journalieres = CuveJournaliereSerializer(many=True, read_only=True)

    class Meta:
        model = CuvePrincipale
        fields = [
            'id',
            'identifiant',
            'capacite',
            'site',
            'site_nom',
            'cuves_journalieres',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_identifiant(self, value):
        value = str(value).strip().upper()
        validate_cp_identifiant(value)
        return value


class CuvePrincipaleNestedSerializer(serializers.ModelSerializer):
    """Version courte pour l’agrégation dans Site."""

    class Meta:
        model = CuvePrincipale
        fields = ['id', 'identifiant', 'capacite']


class SiteSerializer(serializers.ModelSerializer):
    cuves_principales = CuvePrincipaleNestedSerializer(many=True, read_only=True)
    cuves_count = serializers.SerializerMethodField()

    class Meta:
        model = Site
        fields = [
            'id',
            'nom',
            'localisation',
            'statut',
            'cuves_count',
            'cuves_principales',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_cuves_count(self, obj):
        if hasattr(obj, 'cuves_count_anno'):
            return obj.cuves_count_anno
        if hasattr(obj, '_prefetched_objects_cache') and 'cuves_principales' in obj._prefetched_objects_cache:
            return len(obj.cuves_principales.all())
        return obj.cuves_principales.count()


class SiteListSerializer(serializers.ModelSerializer):
    cuves_count = serializers.SerializerMethodField()

    class Meta:
        model = Site
        fields = [
            'id',
            'nom',
            'localisation',
            'statut',
            'cuves_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_cuves_count(self, obj):
        if hasattr(obj, 'cuves_count_anno'):
            return obj.cuves_count_anno
        return obj.cuves_principales.count()
