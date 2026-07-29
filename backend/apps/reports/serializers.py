from rest_framework import serializers

from .models import LigneRapport, Rapport


class LigneRapportSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneRapport
        fields = [
            'id',
            'rapport',
            'cuve_principale',
            'cuve_journaliere',
            'groupe_electrogene',
            'quantite_gasoil_cuve_principale',
            'quantite_gasoil_cuve_journaliere',
            'compteur_horaire',
            'depotage',
            'etat_fonctionnement',
            'observations',
        ]


class RapportSerializer(serializers.ModelSerializer):
    created_by_username = serializers.SerializerMethodField()
    lignes_count = serializers.SerializerMethodField()
    lignes = LigneRapportSerializer(many=True, read_only=True)

    class Meta:
        model = Rapport
        fields = [
            'id',
            'date_debut',
            'date_fin',
            'date_creation',
            'created_by',
            'created_by_username',
            'lignes_count',
            'lignes',
        ]
        read_only_fields = ['id', 'date_creation', 'created_by']

    def get_created_by_username(self, obj):
        user = getattr(obj, 'created_by', None)
        if not user:
            return None
        full = f'{user.first_name} {user.last_name}'.strip()
        return full or user.username

    def get_lignes_count(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'lignes' in obj._prefetched_objects_cache:
            return len(obj.lignes.all())
        return obj.lignes.count()


class RapportListSerializer(serializers.ModelSerializer):
    created_by_username = serializers.SerializerMethodField()
    lignes_count = serializers.SerializerMethodField()

    class Meta:
        model = Rapport
        fields = [
            'id',
            'date_debut',
            'date_fin',
            'date_creation',
            'created_by',
            'created_by_username',
            'lignes_count',
        ]
        read_only_fields = ['id', 'date_creation', 'created_by']

    def get_created_by_username(self, obj):
        user = getattr(obj, 'created_by', None)
        if not user:
            return None
        full = f'{user.first_name} {user.last_name}'.strip()
        return full or user.username

    def get_lignes_count(self, obj):
        return obj.lignes.count()
