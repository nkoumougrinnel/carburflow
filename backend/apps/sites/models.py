from django.db import models


class Site(models.Model):
    """Agrégation de cuves principales (référentiel métier)."""

    STATUT_ACTIF = 'actif'
    STATUT_INACTIF = 'inactif'
    STATUT_CHOICES = [
        (STATUT_ACTIF, 'Actif'),
        (STATUT_INACTIF, 'Inactif'),
    ]

    nom = models.CharField(max_length=150, unique=True)
    localisation = models.CharField(max_length=255, blank=True, default='')
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=STATUT_ACTIF)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'site'
        verbose_name = 'Site'
        verbose_name_plural = 'Sites'
        ordering = ['nom']

    def __str__(self):
        return self.nom


# Export legacy equipment models through the sites package.
# Import after Site is defined to avoid a circular import with apps.equipment.models.
from apps.equipment.models import (
    CP_IDENTIFIANT_RE,
    CJ_IDENTIFIANT_RE,
    CuveJournaliere,
    CuvePrincipale,
    GroupeElectrogene,
    validate_cj_identifiant,
    validate_cp_identifiant,
)


