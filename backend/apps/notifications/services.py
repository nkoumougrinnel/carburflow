"""Services de messagerie / notifications in-app."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.authentication.models import ProfilUtilisateur

from .models import Notification

User = get_user_model()


def admin_recipients():
    """Utilisateurs destinataires des alertes système (admins)."""
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


def create_notification(
    *,
    destinataire,
    contenu,
    sujet='',
    canal=Notification.CANAL_IN_APP,
    alerte=None,
    expediteur=None,
):
    return Notification.objects.create(
        destinataire=destinataire,
        contenu=contenu,
        sujet=(sujet or '')[:200],
        canal=canal,
        alerte=alerte,
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
        already = Notification.objects.filter(
            destinataire=user,
            alerte=alerte,
            lu=False,
            canal=Notification.CANAL_IN_APP,
        ).exists()
        if already:
            continue
        create_notification(
            destinataire=user,
            sujet=sujet,
            contenu=contenu,
            alerte=alerte,
        )
        created += 1
    return created


def send_message(*, expediteur, destinataire, contenu, sujet=''):
    """Envoi manuel d’un message (messagerie)."""
    text = (contenu or '').strip()
    if not text:
        raise ValueError('Le message ne peut pas être vide.')
    return create_notification(
        destinataire=destinataire,
        expediteur=expediteur,
        sujet=(sujet or 'Message').strip()[:200] or 'Message',
        contenu=text,
        canal=Notification.CANAL_IN_APP,
    )
