from django.conf import settings
from django.db import models


class Notification(models.Model):
    CANAL_CHOICES = [
        ('in_app', "Dans l'application"),
        ('email', 'Email'),
        ('sms', 'SMS'),
    ]

    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    alerte = models.ForeignKey(
        'alerts.Alerte',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
    )
    canal = models.CharField(max_length=20, choices=CANAL_CHOICES, default='in_app')
    contenu = models.TextField()
    lu = models.BooleanField(default=False)
    date_envoi = models.DateTimeField(auto_now_add=True)
    date_lecture = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notification'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-date_envoi']

    def __str__(self):
        return f'Notification pour {self.destinataire.username} - {self.date_envoi}'
