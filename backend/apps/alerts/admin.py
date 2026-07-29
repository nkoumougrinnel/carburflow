from django.contrib import admin

from .models import Alerte


@admin.register(Alerte)
class AlerteAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'type_alerte',
        'priorite',
        'etat',
        'site',
        'date_apparition',
        'traite_par',
    )
    list_filter = ('priorite', 'type_alerte', 'etat')
    search_fields = ('message',)
    date_hierarchy = 'date_apparition'
