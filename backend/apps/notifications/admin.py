from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'destinataire',
        'expediteur',
        'sujet',
        'canal',
        'lu',
        'date_envoi',
        'alerte',
    )
    list_filter = ('canal', 'lu')
    search_fields = (
        'sujet',
        'contenu',
        'destinataire__username',
        'destinataire__email',
        'expediteur__username',
    )
    date_hierarchy = 'date_envoi'
    raw_id_fields = ('destinataire', 'expediteur', 'alerte')
