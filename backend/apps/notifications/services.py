"""Services de messagerie / notifications in-app."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.authentication.models import ProfilUtilisateur

from .models import Notification

User = get_user_model()


def admin_recipients():
    """Utilisateurs destinataires des alertes système / messages (admins)."""
    return (
        User.objects.filter(is_active=True)
        .filter(
            Q(is_superuser=True)
            | Q(is_staff=True)
            | Q(
                profil__role__in=[
                    ProfilUtilisateur.ROLE_SUPER_ADMIN,
                    ProfilUtilisateur.ROLE_ADMIN,
                ]
            )
        )
        .distinct()
    )


def user_is_messaging_admin(user) -> bool:
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if user.is_superuser or user.is_staff:
        return True
    profil = getattr(user, 'profil', None)
    role = getattr(profil, 'role', None)
    return role in {
        ProfilUtilisateur.ROLE_SUPER_ADMIN,
        ProfilUtilisateur.ROLE_ADMIN,
    }


def is_admin_recipient(user) -> bool:
    if not user:
        return False
    return admin_recipients().filter(pk=user.pk).exists()


def create_notification(
    *,
    destinataire,
    contenu,
    sujet='',
    canal=Notification.CANAL_IN_APP,
    expediteur=None,
):
    return Notification.objects.create(
        destinataire=destinataire,
        contenu=contenu,
        sujet=(sujet or '')[:200],
        canal=canal,
        expediteur=expediteur,
    )


def notify_admins_for_alerte(alerte):
    """Crée une notification in-app pour chaque admin (évite les doublons non lus)."""
    if alerte is None:
        return 0

    sujet = 'Nouvelle alerte'
    if alerte.priorite == 'critique':
        sujet = 'Alerte critique'
    elif alerte.priorite == 'haute':
        sujet = 'Alerte haute priorité'

    contenu = (alerte.message or 'Une nouvelle alerte a été détectée.').strip()
    created = 0
    for user in admin_recipients():
        # dedupe by destinataire + subject + unread
        already = Notification.objects.filter(
            destinataire=user,
            sujet=sujet,
            lu=False,
            canal=Notification.CANAL_IN_APP,
        ).exists()
        if already:
            continue
        create_notification(
            destinataire=user,
            sujet=sujet,
            contenu=contenu,
        )
        created += 1
    return created


def send_message(*, expediteur, destinataire, contenu, sujet=''):
    """Envoi manuel d’un message (messagerie)."""
    text = (contenu or '').strip()
    if not text:
        raise ValueError('Le message ne peut pas être vide.')
    if getattr(destinataire, 'pk', None) == getattr(expediteur, 'pk', None):
        raise ValueError('Vous ne pouvez pas vous envoyer un message à vous-même.')
    return create_notification(
        destinataire=destinataire,
        expediteur=expediteur,
        sujet=(sujet or 'Message').strip()[:200] or 'Message',
        contenu=text,
        canal=Notification.CANAL_IN_APP,
    )
