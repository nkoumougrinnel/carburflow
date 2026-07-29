from django.conf import settings
from django.db import models


class Rapport(models.Model):
    date_debut = models.DateField()
    date_fin = models.DateField()
    date_creation = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rapports',
    )

    class Meta:
        db_table = 'rapport'
        verbose_name = 'Rapport'
        verbose_name_plural = 'Rapports'
        ordering = ['-date_creation']

    def __str__(self):
        return f'Rapport du {self.date_debut} au {self.date_fin}'


class LigneRapport(models.Model):
    rapport = models.ForeignKey(
        Rapport,
        on_delete=models.CASCADE,
        related_name='lignes',
    )
    cuve_principale = models.ForeignKey(
        'sites.CuvePrincipale',
        on_delete=models.PROTECT,
        related_name='lignes_rapport',
    )
    cuve_journaliere = models.ForeignKey(
        'sites.CuveJournaliere',
        on_delete=models.PROTECT,
        related_name='lignes_rapport',
    )
    groupe_electrogene = models.ForeignKey(
        'sites.GroupeElectrogene',
        on_delete=models.PROTECT,
        related_name='lignes_rapport',
    )

    quantite_gasoil_cuve_principale = models.FloatField(null=True, blank=True)
    quantite_gasoil_cuve_journaliere = models.FloatField(null=True, blank=True)
    compteur_horaire = models.FloatField(null=True, blank=True)
    depotage = models.FloatField(null=True, blank=True)
    etat_fonctionnement = models.CharField(max_length=100, null=True, blank=True)
    observations = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'ligne_rapport'
        verbose_name = 'Ligne de rapport'
        verbose_name_plural = 'Lignes de rapport'

    def __str__(self):
        return f'Ligne {self.id} - Rapport {self.rapport_id}'
