from django.conf import settings
from django.db import models


class Notification(models.Model):
    CANAL_IN_APP = 'in_app'
    CANAL_EMAIL = 'email'
    CANAL_SMS = 'sms'
    CANAL_CHOICES = [
        (CANAL_IN_APP, "Dans l'application"),
        (CANAL_EMAIL, 'Email'),
        (CANAL_SMS, 'SMS'),
    ]

    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    expediteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='messages_envoyes',
        verbose_name='Expéditeur',
    )
    sujet = models.CharField(max_length=200, blank=True, default='')
    canal = models.CharField(max_length=20, choices=CANAL_CHOICES, default=CANAL_IN_APP)
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
        label = self.sujet or self.contenu[:40]
        return f'{self.destinataire.username} — {label}'

    def marquer_lue(self):
        if self.lu:
            return
        from django.utils import timezone
        self.lu = True
        self.date_lecture = timezone.now()
        self.save(update_fields=['lu', 'date_lecture'])
