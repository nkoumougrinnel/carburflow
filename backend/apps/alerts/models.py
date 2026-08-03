from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Alerte(models.Model):
    """
    Alerte métier CarburFlow, persistée à la détection (dépôt de fiche).
    """

    PRIORITE_CHOICES = [
        ('critique', 'Critique'),
        ('haute', 'Haute'),
        ('moyenne', 'Moyenne'),
        ('basse', 'Basse'),
    ]

    TYPE_CHOICES = [
        ('autonomie_critique', 'Autonomie critique (< 24h)'),
        ('conso_sans_horaire', 'Consommation sans delta horaire'),
        ('horaire_sans_conso', 'Delta horaire sans consommation'),
        ('compteur_duplique', 'Compteur horaire dupliqué'),
        ('compteur_incoherent', 'Compteur horaire incohérent'),
        ('autonomie_indeterminee', 'Autonomie indéterminée'),
        ('ecart_conso', 'Écart de consommation (> 15%)'),
        ('autonomie_preventive', 'Autonomie préventive (< 72h)'),
    ]

    ETAT_CHOICES = [
        ('nouvelle', 'Nouvelle'),
        ('en_cours', 'En cours'),
        ('traitee', 'Traitée'),
        ('ignoree', 'Ignorée'),
    ]

    ETATS_ACTIFS = ('nouvelle', 'en_cours')

    cle = models.CharField(
        max_length=120,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text='Clé unique anti-doublon (ex: groupe-3-autonomie_critique)',
    )

    date_apparition = models.DateField(auto_now_add=True, db_index=True)
    date_traitement = models.DateTimeField(null=True, blank=True)

    priorite = models.CharField(
        max_length=20,
        choices=PRIORITE_CHOICES,
        default='moyenne',
        db_index=True,
    )
    type_alerte = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        default='ecart_conso',
        db_index=True,
    )
    message = models.TextField(
        help_text='Message explicatif affiché dans le dashboard',
    )
    donnees_contexte = models.JSONField(
        default=dict,
        blank=True,
        help_text='Données ayant déclenché l’alerte (autonomie, écart, ids…)',
    )

    etat = models.CharField(
        max_length=20,
        choices=ETAT_CHOICES,
        default='nouvelle',
        db_index=True,
    )
    justification = models.TextField(blank=True, default='')

    site = models.ForeignKey(
        'sites.Site',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes',
        db_index=True,
    )
    cuve_journaliere = models.ForeignKey(
        'sites.CuveJournaliere',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes',
        db_index=True,
    )
    groupe_electrogene = models.ForeignKey(
        'sites.GroupeElectrogene',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes',
        db_index=True,
    )
    ligne_rapport = models.ForeignKey(
        'reports.LigneRapport',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes',
        db_index=True,
    )

    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertes_traitees',
        db_index=True,
    )

    class Meta:
        db_table = 'alerte'
        verbose_name = 'Alerte'
        verbose_name_plural = 'Alertes'
        ordering = ['-date_apparition', '-id']
        indexes = [
            models.Index(fields=['etat', 'priorite']),
            models.Index(fields=['site', 'etat']),
            models.Index(fields=['type_alerte', 'date_apparition']),
        ]

    def __str__(self):
        return (
            f'{self.get_priorite_display()} — '
            f'{self.get_type_alerte_display()} — {self.date_apparition}'
        )

    @classmethod
    def generer_cle(cls, type_alerte, reference_id, *, prefix='groupe'):
        return f'{prefix}-{reference_id}-{type_alerte}'

    @property
    def est_active(self):
        return self.etat in self.ETATS_ACTIFS

    @property
    def est_traitee(self):
        return self.etat == 'traitee'

    def clean(self):
        if self.etat == 'traitee' and not (self.justification or '').strip():
            raise ValidationError(
                {'justification': 'Une justification est requise pour une alerte traitée.'}
            )

    def marquer_traitee(self, user, justification):
        if self.etat == 'traitee':
            raise ValueError('Cette alerte est déjà traitée')
        self.etat = 'traitee'
        self.justification = justification.strip()
        self.traite_par = user
        self.date_traitement = timezone.now()
        self.full_clean()
        self.save(
            update_fields=['etat', 'justification', 'traite_par', 'date_traitement']
        )

    def marquer_en_cours(self, user):
        if self.etat not in ('nouvelle', 'ignoree'):
            raise ValueError(f'Impossible de passer de {self.etat} à en_cours')
        self.etat = 'en_cours'
        self.traite_par = user
        self.save(update_fields=['etat', 'traite_par'])

    def marquer_ignoree(self, justification=''):
        if self.etat == 'traitee':
            raise ValueError('Une alerte traitée ne peut pas être ignorée')
        self.etat = 'ignoree'
        self.justification = (justification or '').strip()
        self.save(update_fields=['etat', 'justification'])

    def reouvrir(self, justification=''):
        if self.etat not in ('traitee', 'ignoree'):
            raise ValueError(f'Impossible de réouvrir une alerte en état {self.etat}')
        prefix = f'Réouverture: {(justification or "").strip()}'.strip()
        self.etat = 'nouvelle'
        self.justification = prefix if justification else ''
        self.traite_par = None
        self.date_traitement = None
        self.save(
            update_fields=['etat', 'justification', 'traite_par', 'date_traitement']
        )
