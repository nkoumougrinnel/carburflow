from django.conf import settings
from django.db import models


class ProfilUtilisateur(models.Model):
    ROLE_SUPER_ADMIN = 'super_admin'
    ROLE_ADMIN = 'admin'
    ROLE_AGENT = 'agent'
    ROLE_USER = 'user'
    ROLE_CHOICES = [
        (ROLE_SUPER_ADMIN, 'Super Administrateur'),
        (ROLE_ADMIN, 'Administrateur'),
        (ROLE_AGENT, 'Agent de terrain'),
        (ROLE_USER, 'Utilisateur'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profil',
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'profil_utilisateur'
        verbose_name = 'Profil utilisateur'
        verbose_name_plural = 'Profils utilisateurs'

    def __str__(self):
        return f'{self.user.username} - {self.get_role_display()}'

    @property
    def is_admin(self):
        return self.role in {self.ROLE_SUPER_ADMIN, self.ROLE_ADMIN} or (
            self.user.is_superuser or self.user.is_staff
        )

    @property
    def is_agent(self):
        return self.role == self.ROLE_AGENT

    @property
    def role_api(self):
        """Rôle exposé à l’API"""
        if self.role in {self.ROLE_SUPER_ADMIN, self.ROLE_ADMIN}:
            return 'admin'
        if self.role == self.ROLE_AGENT:
            return 'operateur'
        return 'user'


# Alias de compatibilité
UserProfile = ProfilUtilisateur
