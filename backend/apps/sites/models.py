import re

from django.core.exceptions import ValidationError
from django.db import models


CP_IDENTIFIANT_RE = re.compile(r'^CP\d{3,}$')
CJ_IDENTIFIANT_RE = re.compile(r'^CJ\d{3,}$')


def validate_cp_identifiant(value: str) -> None:
    """Identifiant cuve principale : format CPxxx (ex. CP001, CP012)."""
    if not CP_IDENTIFIANT_RE.match(str(value).strip().upper()):
        raise ValidationError(
            'L’identifiant de cuve principale doit respecter le format CPxxx '
            '(ex. CP001, CP042).'
        )


def validate_cj_identifiant(value: str) -> None:
    """Identifiant cuve journalière : format CJxxx (ex. CJ001, CJ012)."""
    if not CJ_IDENTIFIANT_RE.match(str(value).strip().upper()):
        raise ValidationError(
            'L’identifiant de cuve journalière doit respecter le format CJxxx '
            '(ex. CJ001, CJ042).'
        )


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


class CuvePrincipale(models.Model):
    identifiant = models.CharField(
        max_length=100,
        unique=True,
        validators=[validate_cp_identifiant],
        help_text='Format CPxxx (ex. CP001)',
    )
    capacite = models.FloatField()
    site = models.ForeignKey(
        Site,
        on_delete=models.CASCADE,
        related_name='cuves_principales',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cuve_principale'
        verbose_name = 'Cuve principale'
        verbose_name_plural = 'Cuves principales'
        ordering = ['identifiant']

    def __str__(self):
        return f'{self.identifiant} - {self.site.nom}'

    def clean(self):
        super().clean()
        if self.identifiant:
            self.identifiant = self.identifiant.strip().upper()
            validate_cp_identifiant(self.identifiant)

    def save(self, *args, **kwargs):
        if self.identifiant:
            self.identifiant = self.identifiant.strip().upper()
        self.full_clean()
        return super().save(*args, **kwargs)


class GroupeElectrogene(models.Model):
    identifiant = models.CharField(max_length=100, unique=True)
    marque = models.CharField(max_length=100)
    puissance = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'groupe_electrogene'
        verbose_name = 'Groupe électrogène'
        verbose_name_plural = 'Groupes électrogènes'
        ordering = ['identifiant']

    def __str__(self):
        return self.identifiant


class CuveJournaliere(models.Model):
    identifiant = models.CharField(
        max_length=100,
        unique=True,
        validators=[validate_cj_identifiant],
        help_text='Format CJxxx (ex. CJ001)',
    )
    capacite = models.FloatField()
    cuve_principale = models.ForeignKey(
        CuvePrincipale,
        on_delete=models.CASCADE,
        related_name='cuves_journalieres',
    )
    groupe_electrogene = models.OneToOneField(
        GroupeElectrogene,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='cuve_journaliere',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cuve_journaliere'
        verbose_name = 'Cuve journalière'
        verbose_name_plural = 'Cuves journalières'
        ordering = ['identifiant']

    def __str__(self):
        return self.identifiant

    def clean(self):
        super().clean()
        if self.identifiant:
            self.identifiant = self.identifiant.strip().upper()
            validate_cj_identifiant(self.identifiant)

    def save(self, *args, **kwargs):
        if self.identifiant:
            self.identifiant = self.identifiant.strip().upper()
        self.full_clean()
        return super().save(*args, **kwargs)
