from django.db import models

class Site(models.Model):
    """
    Représente un site technique.
    Dans l'architecture CarburFlow, un Site est associé à une unique Cuve Principale.
    """
    nom = models.CharField(
        max_length=255,
        unique=True,
        help_text="Nom unique du site (ex: Site Douala Nord)"
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        help_text="Code technique du site"
    )
    adresse = models.TextField(
        blank=True,
        null=True,
        help_text="Adresse physique du site"
    )
    ville = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'site'
        verbose_name = 'Site'
        verbose_name_plural = 'Sites'
        ordering = ['nom']

    def __str__(self):
        return self.nom
