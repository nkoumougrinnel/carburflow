from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'destinataire', 'canal', 'lu', 'date_envoi', 'alerte')
    list_filter = ('canal', 'lu')
    search_fields = ('contenu', 'destinataire__username')
    date_hierarchy = 'date_envoi'
