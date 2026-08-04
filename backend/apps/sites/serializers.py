from rest_framework import serializers

from apps.equipment.models import CuvePrincipale

from .models import Site


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
