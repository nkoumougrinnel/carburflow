"""Helpers de création d’objets pour les tests sites."""

from __future__ import annotations

from django.contrib.auth import get_user_model

from apps.authentication.models import ProfilUtilisateur
from apps.sites.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene, Site

User = get_user_model()


def make_site(**kwargs) -> Site:
    defaults = {
        'nom': 'SITE TEST',
        'localisation': 'Douala',
        'statut': Site.STATUT_ACTIF,
    }
    defaults.update(kwargs)
    return Site.objects.create(**defaults)


def make_cp(site: Site | None = None, **kwargs) -> CuvePrincipale:
    if site is None:
        site = make_site()
    defaults = {
        'identifiant': 'CP001',
        'capacite': 10000.0,
        'site': site,
    }
    defaults.update(kwargs)
    return CuvePrincipale.objects.create(**defaults)


def make_groupe(**kwargs) -> GroupeElectrogene:
    defaults = {
        'identifiant': 'G1-SDMO-830',
        'marque': 'SDMO',
        'puissance': '830',
    }
    defaults.update(kwargs)
    return GroupeElectrogene.objects.create(**defaults)


def make_cj(
    cuve_principale: CuvePrincipale | None = None,
    groupe: GroupeElectrogene | None = None,
    **kwargs,
) -> CuveJournaliere:
    if cuve_principale is None:
        cuve_principale = make_cp()
    defaults = {
        'identifiant': 'CJ001',
        'capacite': 1000.0,
        'cuve_principale': cuve_principale,
        'groupe_electrogene': groupe,
    }
    defaults.update(kwargs)
    return CuveJournaliere.objects.create(**defaults)


def make_user(
    *,
    username: str = 'admin',
    password: str = 'admin123',
    role: str = ProfilUtilisateur.ROLE_ADMIN,
    is_staff: bool = False,
    is_superuser: bool = False,
    site: Site | None = None,
) -> User:
    user = User.objects.create_user(
        username=username,
        email=f'{username}@test.local',
        password=password,
        is_staff=is_staff or role in {
            ProfilUtilisateur.ROLE_ADMIN,
            ProfilUtilisateur.ROLE_SUPER_ADMIN,
        },
        is_superuser=is_superuser or role == ProfilUtilisateur.ROLE_SUPER_ADMIN,
    )
    ProfilUtilisateur.objects.create(user=user, role=role, site=site)
    return user
