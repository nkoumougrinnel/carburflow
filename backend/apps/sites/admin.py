from django.contrib import admin

from .models import CuveJournaliere, CuvePrincipale, GroupeElectrogene, Site


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ('nom', 'localisation', 'statut', 'created_at')
    list_filter = ('statut',)
    search_fields = ('nom', 'localisation')
    ordering = ('nom',)


@admin.register(CuvePrincipale)
class CuvePrincipaleAdmin(admin.ModelAdmin):
    list_display = ('identifiant', 'capacite', 'site')
    list_filter = ('site',)
    search_fields = ('identifiant', 'site__nom')
    ordering = ('identifiant',)


@admin.register(GroupeElectrogene)
class GroupeElectrogeneAdmin(admin.ModelAdmin):
    list_display = ('identifiant', 'marque', 'puissance')
    search_fields = ('identifiant', 'marque', 'puissance')
    ordering = ('identifiant',)


@admin.register(CuveJournaliere)
class CuveJournaliereAdmin(admin.ModelAdmin):
    list_display = ('identifiant', 'capacite', 'cuve_principale', 'groupe_electrogene')
    list_filter = ('cuve_principale',)
    search_fields = ('identifiant', 'groupe_electrogene__identifiant', 'cuve_principale__identifiant')
