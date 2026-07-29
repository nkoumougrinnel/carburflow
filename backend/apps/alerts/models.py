from django.conf import settings
from django.db import models


class Alerte(models.Model):
    PRIORITE_CHOICES = [
        ('basse', 'Basse'),
        ('moyenne', 'Moyenne'),
        ('haute', 'Haute'),
        ('critique', 'Critique'),
    ]

    TYPE_CHOICES = [
        ('seuil_bas', 'Seuil bas'),
        ('panne', 'Panne'),
        ('ecart_releve', 'Écart de relevé'),
        ('compteur_anormal', 'Compteur anormal'),
        ('autre', 'Autre'),
    ]

    ETAT_CHOICES = [
        ('nouvelle', 'Nouvelle'),
        ('en_cours', 'En cours'),
        ('traitee', 'Traitée'),
        ('ignoree', 'Ignorée'),
    ]

    date_apparition = models.DateField(auto_now_add=True)
    priorite = models.CharField(max_length=20, choices=PRIORITE_CHOICES, default='moyenne')
    type_alerte = models.CharField(max_length=50, choices=TYPE_CHOICES, default='autre')
    message = models.TextField()
    etat = models.CharField(max_length=20, choices=ETAT_CHOICES, default='nouvelle')

    site = models.ForeignKey(
        'sites.Site',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes',
    )
    cuve_journaliere = models.ForeignKey(
        'sites.CuveJournaliere',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes',
    )
    groupe_electrogene = models.ForeignKey(
        'sites.GroupeElectrogene',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes',
    )
    ligne_rapport = models.ForeignKey(
        'reports.LigneRapport',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes',
    )

    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes_traitees',
    )
    date_traitement = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'alerte'
        verbose_name = 'Alerte'
        verbose_name_plural = 'Alertes'
        ordering = ['-date_apparition']

    def __str__(self):
        return f'Alerte {self.id} - {self.get_type_alerte_display()}'
