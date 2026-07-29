"""
Services d'import / export depuis `data/imports/` et vers `data/exports/`.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction

from apps.authentication.models import ProfilUtilisateur
from apps.reports.models import LigneRapport, Rapport
from apps.sites.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene, Site

from .parsers import (
    cell,
    normalize_cj_code,
    normalize_cp_code,
    parse_csv,
    to_float,
    to_str,
    write_csv,
)
from .validators import (
    ValidationResult,
    merge_results,
    validate_cuve_journaliere_groupe,
    validate_cuves_journalieres,
    validate_cuves_principales,
    validate_groupes,
    validate_lignes_rapport,
    validate_sites,
    validate_users,
)

logger = logging.getLogger('carburflow.import')

IMPORT_FILES = (
    'users.csv',
    'sites.csv',
    'cuves_principales.csv',
    'groupes.csv',
    'cuves_journalieres.csv',
    'cuve_journaliere_groupe.csv',
    'lignes_rapport.csv',
)

ROLE_MAP = {
    'super_admin': ProfilUtilisateur.ROLE_SUPER_ADMIN,
    'admin': ProfilUtilisateur.ROLE_ADMIN,
    'agent': ProfilUtilisateur.ROLE_AGENT,
    'operateur': ProfilUtilisateur.ROLE_AGENT,
    'user': ProfilUtilisateur.ROLE_USER,
}


def default_imports_dir() -> Path:
    return Path(settings.PROJECT_ROOT) / 'data' / 'imports'


def default_exports_dir() -> Path:
    return Path(settings.PROJECT_ROOT) / 'data' / 'exports'


def default_logs_dir() -> Path:
    return Path(settings.PROJECT_ROOT) / 'data' / 'logs'


def setup_import_logger() -> logging.Logger:
    logs_dir = default_logs_dir()
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_path = logs_dir / 'import.log'
    if not any(
        isinstance(h, logging.FileHandler) and getattr(h, 'baseFilename', '') == str(log_path)
        for h in logger.handlers
    ):
        handler = logging.FileHandler(log_path, encoding='utf-8')
        handler.setFormatter(
            logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


@dataclass
class ImportStats:
    users: int = 0
    sites: int = 0
    cuves_principales: int = 0
    groupes: int = 0
    cuves_journalieres: int = 0
    liaisons_cj_groupe: int = 0
    rapports: int = 0
    lignes: int = 0
    warnings: list[str] = field(default_factory=list)
    missing_files: list[str] = field(default_factory=list)


class ImportDataService:
    """Parse → valide → persiste les CSV de `data/imports/`."""

    def __init__(
        self,
        imports_dir: Path | None = None,
        *,
        skip_users: bool = False,
        skip_lignes: bool = False,
        dry_run: bool = False,
    ):
        self.imports_dir = Path(imports_dir or default_imports_dir())
        self.skip_users = skip_users
        self.skip_lignes = skip_lignes
        self.dry_run = dry_run
        self.stats = ImportStats()
        self._cp_by_key: dict[str, CuvePrincipale] = {}
        self._cj_by_key: dict[str, CuveJournaliere] = {}
        self._groupe_by_key: dict[str, GroupeElectrogene] = {}
        self.log = setup_import_logger()

    def run(self) -> tuple[ImportStats, ValidationResult]:
        if not self.imports_dir.is_dir():
            raise FileNotFoundError(f'Répertoire introuvable : {self.imports_dir}')

        self.log.info('Import démarré depuis %s', self.imports_dir)

        users = self._load('users.csv') if not self.skip_users else []
        sites = self._load('sites.csv')
        cps = self._load('cuves_principales.csv')
        groupes = self._load('groupes.csv')
        cjs = self._load('cuves_journalieres.csv')
        liens = self._load('cuve_journaliere_groupe.csv')
        lignes = self._load('lignes_rapport.csv') if not self.skip_lignes else []

        validation = merge_results(
            validate_users(users) if users else ValidationResult(),
            validate_sites(sites),
            validate_cuves_principales(cps),
            validate_groupes(groupes),
            validate_cuves_journalieres(cjs),
            validate_cuve_journaliere_groupe(liens) if liens else ValidationResult(),
            validate_lignes_rapport(lignes) if lignes else ValidationResult(),
        )
        for warning in validation.warnings:
            msg = f'{warning.file}:L{warning.row} {warning.message}'
            self.stats.warnings.append(msg)
            self.log.warning(msg)

        if not validation.ok:
            for err in validation.errors:
                self.log.error('%s:L%s [%s] %s', err.file, err.row, err.field, err.message)
            return self.stats, validation

        if self.dry_run:
            self.log.info('Dry-run OK — aucune écriture')
            return self.stats, validation

        with transaction.atomic():
            if users:
                self._import_users(users)
            self._import_sites(sites)
            self._import_cuves_principales(cps)
            self._import_groupes(groupes)
            self._import_cuves_journalieres(cjs)
            if liens:
                self._import_liens_cj_groupe(liens)
            if lignes:
                self._import_lignes(lignes)

        self.log.info(
            'Import terminé : sites=%s CP=%s G=%s CJ=%s liaisons=%s rapports=%s lignes=%s',
            self.stats.sites,
            self.stats.cuves_principales,
            self.stats.groupes,
            self.stats.cuves_journalieres,
            self.stats.liaisons_cj_groupe,
            self.stats.rapports,
            self.stats.lignes,
        )
        return self.stats, validation

    def _load(self, filename: str) -> list[dict]:
        path = self.imports_dir / filename
        if not path.exists() or path.stat().st_size == 0:
            self.stats.missing_files.append(filename)
            self.log.warning('Fichier absent ou vide : %s', filename)
            return []
        rows = parse_csv(path)
        self.log.info('%s — %s ligne(s)', filename, len(rows))
        return rows

    # ── Users ────────────────────────────────────────────────────────────────

    def _import_users(self, rows: list[dict]) -> None:
        User = get_user_model()
        count = 0
        for row in rows:
            username = to_str(cell(row, 'username'))
            if not username:
                continue
            email = to_str(cell(row, 'email')) or f'{username}@carburflow.local'
            password = to_str(cell(row, 'password')) or 'changeme'
            role_raw = (to_str(cell(row, 'role')) or 'user').lower()
            role = ROLE_MAP.get(role_raw, ProfilUtilisateur.ROLE_USER)
            site_name = to_str(cell(row, 'site'))
            site = Site.objects.filter(nom__iexact=site_name).first() if site_name else None

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': to_str(cell(row, 'first_name')) or '',
                    'last_name': to_str(cell(row, 'last_name')) or '',
                    'is_staff': role in {
                        ProfilUtilisateur.ROLE_ADMIN,
                        ProfilUtilisateur.ROLE_SUPER_ADMIN,
                    },
                    'is_superuser': role == ProfilUtilisateur.ROLE_SUPER_ADMIN,
                },
            )
            if created:
                user.set_password(password)
                user.save()
            else:
                user.email = email
                user.first_name = to_str(cell(row, 'first_name')) or user.first_name
                user.last_name = to_str(cell(row, 'last_name')) or user.last_name
                if to_str(cell(row, 'password')):
                    user.set_password(password)
                user.save()

            ProfilUtilisateur.objects.update_or_create(
                user=user,
                defaults={'role': role, 'site': site},
            )
            count += 1
        self.stats.users = count

    # ── Sites / CP / Groupes / CJ ────────────────────────────────────────────

    def _import_sites(self, rows: list[dict]) -> None:
        count = 0
        for row in rows:
            nom = to_str(cell(row, 'nom'))
            if not nom:
                continue
            statut = (to_str(cell(row, 'statut')) or Site.STATUT_ACTIF).lower()
            if statut not in {Site.STATUT_ACTIF, Site.STATUT_INACTIF}:
                statut = Site.STATUT_ACTIF
            Site.objects.update_or_create(
                nom=nom,
                defaults={
                    'localisation': to_str(cell(row, 'localisation')) or '',
                    'statut': statut,
                },
            )
            count += 1
        self.stats.sites = count

    def _index_cp(self, cp: CuvePrincipale) -> None:
        self._cp_by_key[cp.identifiant.upper()] = cp
        if cp.site_id:
            self._cp_by_key[cp.site.nom.strip().upper()] = cp

    def _resolve_cp(self, raw: str | None) -> CuvePrincipale | None:
        key = to_str(raw)
        if not key:
            return None
        found = self._cp_by_key.get(key.upper())
        if found:
            return found
        code = normalize_cp_code(key)
        if code:
            return self._cp_by_key.get(code) or CuvePrincipale.objects.filter(
                identifiant__iexact=code
            ).first()
        site = Site.objects.filter(nom__iexact=key).first()
        if site:
            return site.cuves_principales.order_by('id').first()
        return None

    def _import_cuves_principales(self, rows: list[dict]) -> None:
        count = 0
        for row in rows:
            raw_id = to_str(cell(row, 'identifiant', 'id_cuve_principale', 'cuve_principale'))
            site_name = to_str(cell(row, 'site', 'nom'))
            if not raw_id or not site_name:
                continue
            code = normalize_cp_code(raw_id)
            if not code:
                continue
            site, _ = Site.objects.get_or_create(
                nom=site_name,
                defaults={'localisation': '', 'statut': Site.STATUT_ACTIF},
            )
            cp, _ = CuvePrincipale.objects.update_or_create(
                identifiant=code,
                defaults={
                    'capacite': to_float(cell(row, 'capacite'), default=10000.0),
                    'site': site,
                },
            )
            self._index_cp(cp)
            count += 1
        for cp in CuvePrincipale.objects.select_related('site'):
            self._index_cp(cp)
        self.stats.cuves_principales = count

    def _import_groupes(self, rows: list[dict]) -> None:
        count = 0
        for row in rows:
            ident = to_str(cell(row, 'identifiant', 'id_groupe', 'groupe'))
            if not ident:
                continue
            obj, _ = GroupeElectrogene.objects.update_or_create(
                identifiant=ident,
                defaults={
                    'marque': to_str(cell(row, 'marque')) or 'À préciser',
                    'puissance': str(to_str(cell(row, 'puissance')) or '0'),
                },
            )
            self._groupe_by_key[ident.upper()] = obj
            count += 1
        for g in GroupeElectrogene.objects.all():
            self._groupe_by_key[g.identifiant.upper()] = g
        self.stats.groupes = count

    def _lookup_groupe(self, raw: str | None) -> GroupeElectrogene | None:
        key = to_str(raw)
        if not key:
            return None
        return self._groupe_by_key.get(key.upper()) or GroupeElectrogene.objects.filter(
            identifiant__iexact=key
        ).first()

    def _detach_groupe(self, groupe: GroupeElectrogene | None, cj_name: str) -> None:
        if groupe is None:
            return
        related = getattr(groupe, 'cuve_journaliere', None)
        if related is not None and related.identifiant.upper() != cj_name.upper():
            related.groupe_electrogene = None
            related.save(update_fields=['groupe_electrogene', 'updated_at'])

    def _import_cuves_journalieres(self, rows: list[dict]) -> None:
        """Importe les CJ (CJxxx) sans liaison groupe — voir cuve_journaliere_groupe.csv."""
        count = 0
        for row in rows:
            raw_id = to_str(cell(row, 'identifiant', 'id_cuve_journaliere', 'cuve_journaliere'))
            cp_ref = to_str(cell(row, 'cuve_principale', 'id_cuve_principale', 'site'))
            if not raw_id or not cp_ref:
                continue
            code = normalize_cj_code(raw_id)
            if not code:
                self.stats.warnings.append(
                    f'CJ ignorée « {raw_id} » : identifiant hors format CJxxx'
                )
                continue
            cp = self._resolve_cp(cp_ref)
            if cp is None:
                self.stats.warnings.append(f'CJ « {code} » : CP/site inconnu « {cp_ref} »')
                continue
            # Groupe éventuel dans le même fichier (compat), sinon fichier de liaison
            groupe = self._lookup_groupe(to_str(cell(row, 'groupe', 'id_groupe')))
            defaults = {
                'cuve_principale': cp,
                'capacite': to_float(cell(row, 'capacite'), default=1000.0),
            }
            if groupe is not None:
                self._detach_groupe(groupe, code)
                defaults['groupe_electrogene'] = groupe
            obj, _ = CuveJournaliere.objects.update_or_create(
                identifiant=code,
                defaults=defaults,
            )
            self._cj_by_key[code] = obj
            count += 1
        for cj in CuveJournaliere.objects.all():
            self._cj_by_key[cj.identifiant.upper()] = cj
        self.stats.cuves_journalieres = count

    def _import_liens_cj_groupe(self, rows: list[dict]) -> None:
        count = 0
        for row in rows:
            raw_cj = to_str(cell(row, 'cuve_journaliere', 'id_cuve_journaliere', 'identifiant'))
            raw_g = to_str(cell(row, 'groupe', 'id_groupe'))
            if not raw_cj or not raw_g:
                continue
            cj_code = normalize_cj_code(raw_cj) or raw_cj.upper()
            cj = self._cj_by_key.get(cj_code) or CuveJournaliere.objects.filter(
                identifiant__iexact=cj_code
            ).first()
            if cj is None:
                self.stats.warnings.append(f'Liaison : CJ inconnue « {raw_cj} »')
                continue
            groupe = self._lookup_groupe(raw_g)
            if groupe is None:
                self.stats.warnings.append(
                    f'Liaison : groupe inconnu « {raw_g} » (CJ « {cj.identifiant} »)'
                )
                continue
            self._detach_groupe(groupe, cj.identifiant)
            cj.groupe_electrogene = groupe
            cj.save(update_fields=['groupe_electrogene', 'updated_at'])
            count += 1
        self.stats.liaisons_cj_groupe = count

    # ── Lignes rapport ───────────────────────────────────────────────────────

    def _parse_date(self, raw: Any) -> date | None:
        text = to_str(raw)
        if not text:
            return None
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
        return None

    def _import_lignes(self, rows: list[dict]) -> None:
        # Grouper par période
        buckets: dict[tuple[date, date], list[dict]] = {}
        for row in rows:
            d1 = self._parse_date(cell(row, 'date_debut'))
            d2 = self._parse_date(cell(row, 'date_fin'))
            if not d1 or not d2:
                self.stats.warnings.append('Ligne rapport sans période valide — ignorée')
                continue
            buckets.setdefault((d1, d2), []).append(row)

        for (d1, d2), bucket in sorted(buckets.items()):
            rapport = Rapport.objects.create(date_debut=d1, date_fin=d2)
            imported = 0
            for row in bucket:
                cj_name = to_str(cell(row, 'cuve_journaliere', 'id_cuve_journaliere', 'identifiant'))
                cp_ref = to_str(cell(row, 'cuve_principale', 'id_cuve_principale', 'site'))
                g_ref = to_str(cell(row, 'groupe', 'id_groupe', 'groupe_marque'))

                cj_code = normalize_cj_code(cj_name) if cj_name else None
                cj = None
                if cj_code:
                    cj = self._cj_by_key.get(cj_code)
                if cj is None and cj_name:
                    cj = self._cj_by_key.get(cj_name.upper()) or CuveJournaliere.objects.filter(
                        identifiant__iexact=cj_name
                    ).first()

                cp = self._resolve_cp(cp_ref) if cp_ref else None
                if cp is None and cj is not None:
                    cp = cj.cuve_principale

                groupe = self._lookup_groupe(g_ref)
                if groupe is None and cj is not None:
                    groupe = cj.groupe_electrogene

                if not cp or not cj or not groupe:
                    self.stats.warnings.append(
                        f'Ligne ignorée (CJ={cj_name}, CP={cp_ref}, G={g_ref})'
                    )
                    continue

                def _opt_float(value):
                    if value in (None, ''):
                        return None
                    return to_float(value)

                LigneRapport.objects.create(
                    rapport=rapport,
                    cuve_principale=cp,
                    cuve_journaliere=cj,
                    groupe_electrogene=groupe,
                    quantite_gasoil_cuve_principale=_opt_float(
                        cell(row, 'quantite_cuve_principale')
                    ),
                    quantite_gasoil_cuve_journaliere=_opt_float(
                        cell(row, 'quantite_cuve_journaliere')
                    ),
                    depotage=_opt_float(cell(row, 'depotage')),
                    compteur_horaire=_opt_float(cell(row, 'compteur_horaire')),
                    etat_fonctionnement=to_str(cell(row, 'etat_fonctionnement')) or 'F',
                    observations=to_str(cell(row, 'observations')) or '',
                )
                imported += 1

            self.stats.rapports += 1
            self.stats.lignes += imported
            self.log.info('Rapport %s (%s→%s) — %s ligne(s)', rapport.id, d1, d2, imported)


class ExportDataService:
    """Exporte le référentiel + lignes vers `data/exports/`."""

    def __init__(self, exports_dir: Path | None = None):
        self.exports_dir = Path(exports_dir or default_exports_dir())
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        self.log = setup_import_logger()

    def run(self) -> dict[str, Path]:
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        out_dir = self.exports_dir / f'export_{stamp}'
        out_dir.mkdir(parents=True, exist_ok=True)
        written: dict[str, Path] = {}

        written['sites'] = write_csv(
            out_dir / 'sites.csv',
            ['nom', 'localisation', 'statut'],
            [
                {
                    'nom': s.nom,
                    'localisation': s.localisation,
                    'statut': s.statut,
                }
                for s in Site.objects.order_by('nom')
            ],
        )
        written['cuves_principales'] = write_csv(
            out_dir / 'cuves_principales.csv',
            ['identifiant', 'site', 'capacite'],
            [
                {
                    'identifiant': cp.identifiant,
                    'site': cp.site.nom,
                    'capacite': cp.capacite,
                }
                for cp in CuvePrincipale.objects.select_related('site').order_by('identifiant')
            ],
        )
        written['groupes'] = write_csv(
            out_dir / 'groupes.csv',
            ['identifiant', 'marque', 'puissance'],
            [
                {
                    'identifiant': g.identifiant,
                    'marque': g.marque,
                    'puissance': g.puissance,
                }
                for g in GroupeElectrogene.objects.order_by('identifiant')
            ],
        )
        written['cuves_journalieres'] = write_csv(
            out_dir / 'cuves_journalieres.csv',
            ['identifiant', 'cuve_principale', 'capacite'],
            [
                {
                    'identifiant': cj.identifiant,
                    'cuve_principale': cj.cuve_principale.identifiant,
                    'capacite': cj.capacite,
                }
                for cj in CuveJournaliere.objects.select_related('cuve_principale').order_by(
                    'identifiant'
                )
            ],
        )
        written['cuve_journaliere_groupe'] = write_csv(
            out_dir / 'cuve_journaliere_groupe.csv',
            ['cuve_journaliere', 'groupe'],
            [
                {
                    'cuve_journaliere': cj.identifiant,
                    'groupe': cj.groupe_electrogene.identifiant,
                }
                for cj in CuveJournaliere.objects.select_related('groupe_electrogene')
                .filter(groupe_electrogene__isnull=False)
                .order_by('identifiant')
            ],
        )

        lignes_rows = []
        for ligne in LigneRapport.objects.select_related(
            'rapport',
            'cuve_principale',
            'cuve_journaliere',
            'groupe_electrogene',
        ).order_by('rapport_id', 'id'):
            lignes_rows.append(
                {
                    'date_debut': ligne.rapport.date_debut.isoformat(),
                    'date_fin': ligne.rapport.date_fin.isoformat(),
                    'cuve_journaliere': ligne.cuve_journaliere.identifiant,
                    'cuve_principale': ligne.cuve_principale.identifiant,
                    'groupe': ligne.groupe_electrogene.identifiant,
                    'quantite_cuve_principale': ligne.quantite_gasoil_cuve_principale,
                    'quantite_cuve_journaliere': ligne.quantite_gasoil_cuve_journaliere,
                    'depotage': ligne.depotage,
                    'compteur_horaire': ligne.compteur_horaire,
                    'etat_fonctionnement': ligne.etat_fonctionnement or '',
                    'observations': ligne.observations or '',
                }
            )
        written['lignes_rapport'] = write_csv(
            out_dir / 'lignes_rapport.csv',
            [
                'date_debut',
                'date_fin',
                'cuve_journaliere',
                'cuve_principale',
                'groupe',
                'quantite_cuve_principale',
                'quantite_cuve_journaliere',
                'depotage',
                'compteur_horaire',
                'etat_fonctionnement',
                'observations',
            ],
            lignes_rows,
        )

        # users (sans mot de passe)
        User = get_user_model()
        users_rows = []
        for user in User.objects.select_related('profil', 'profil__site').order_by('username'):
            profil = getattr(user, 'profil', None)
            users_rows.append(
                {
                    'username': user.username,
                    'email': user.email,
                    'password': '',
                    'role': profil.role if profil else 'user',
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'site': profil.site.nom if profil and profil.site_id else '',
                }
            )
        written['users'] = write_csv(
            out_dir / 'users.csv',
            ['username', 'email', 'password', 'role', 'first_name', 'last_name', 'site'],
            users_rows,
        )

        # log export
        logs_dir = default_logs_dir()
        logs_dir.mkdir(parents=True, exist_ok=True)
        with (logs_dir / 'export.log').open('a', encoding='utf-8') as handle:
            handle.write(f'{datetime.now().isoformat()} export → {out_dir}\n')

        self.log.info('Export écrit dans %s', out_dir)
        return written
