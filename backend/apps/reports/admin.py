from django.contrib import admin

from .models import LigneRapport, Rapport


class LigneRapportInline(admin.TabularInline):
    model = LigneRapport
    fk_name = 'rapport'
    extra = 0


@admin.register(Rapport)
class RapportAdmin(admin.ModelAdmin):
    list_display = ('id', 'date_debut', 'date_fin', 'date_creation', 'created_by')
    date_hierarchy = 'date_debut'
    ordering = ('-date_creation',)
    inlines = [LigneRapportInline]


@admin.register(LigneRapport)
class LigneRapportAdmin(admin.ModelAdmin):
    list_display = (
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
    )
    list_filter = ('etat_fonctionnement', 'rapport')
    search_fields = ('observations',)
