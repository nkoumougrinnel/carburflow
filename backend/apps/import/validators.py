"""
Validation des lignes CSV avant persistance.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .parsers import cell, normalize_cj_code, normalize_cp_code, to_str

CP_RE = re.compile(r'^CP\d{3,}$')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
ALLOWED_ROLES = {'super_admin', 'admin', 'agent', 'user', 'operateur'}
ALLOWED_STATUTS = {'actif', 'inactif'}


@dataclass
class ValidationIssue:
    file: str
    row: int | None
    field: str | None
    message: str
    level: str = 'error'  # error | warning


@dataclass
class ValidationResult:
    ok: bool = True
    issues: list[ValidationIssue] = field(default_factory=list)

    def add(self, issue: ValidationIssue) -> None:
        self.issues.append(issue)
        if issue.level == 'error':
            self.ok = False

    @property
    def errors(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.level == 'error']

    @property
    def warnings(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.level == 'warning']


def _require(result: ValidationResult, file: str, row_num: int, row: dict, *fields: str) -> None:
    for name in fields:
        if to_str(cell(row, name)) is None:
            result.add(
                ValidationIssue(
                    file=file,
                    row=row_num,
                    field=name,
                    message=f'Champ obligatoire manquant : {name}',
                )
            )


def validate_users(rows: list[dict]) -> ValidationResult:
    result = ValidationResult()
    seen = set()
    for idx, row in enumerate(rows, start=2):
        _require(result, 'users.csv', idx, row, 'username')
        username = to_str(cell(row, 'username'))
        if username:
            if username.lower() in seen:
                result.add(
                    ValidationIssue('users.csv', idx, 'username', f'Username en double : {username}')
                )
            seen.add(username.lower())
        role = (to_str(cell(row, 'role')) or 'user').lower()
        if role not in ALLOWED_ROLES:
            result.add(
                ValidationIssue(
                    'users.csv',
                    idx,
                    'role',
                    f'Rôle invalide « {role} » (attendu : {", ".join(sorted(ALLOWED_ROLES))})',
                )
            )
        email = to_str(cell(row, 'email'))
        if email and not EMAIL_RE.match(email):
            result.add(ValidationIssue('users.csv', idx, 'email', f'Email invalide : {email}'))
    return result


def validate_sites(rows: list[dict]) -> ValidationResult:
    result = ValidationResult()
    seen = set()
    for idx, row in enumerate(rows, start=2):
        _require(result, 'sites.csv', idx, row, 'nom')
        nom = to_str(cell(row, 'nom'))
        if nom:
            key = nom.upper()
            if key in seen:
                result.add(ValidationIssue('sites.csv', idx, 'nom', f'Site en double : {nom}'))
            seen.add(key)
        statut = (to_str(cell(row, 'statut')) or 'actif').lower()
        if statut not in ALLOWED_STATUTS:
            result.add(
                ValidationIssue('sites.csv', idx, 'statut', f'Statut invalide : {statut}')
            )
    return result


def validate_cuves_principales(rows: list[dict]) -> ValidationResult:
    result = ValidationResult()
    seen = set()
    for idx, row in enumerate(rows, start=2):
        raw = to_str(cell(row, 'identifiant', 'id_cuve_principale'))
        site = to_str(cell(row, 'site', 'nom'))
        capacite = to_str(cell(row, 'capacite'))
        if not raw:
            result.add(
                ValidationIssue(
                    'cuves_principales.csv',
                    idx,
                    'identifiant',
                    'Champ obligatoire manquant : identifiant',
                )
            )
        if not site:
            result.add(
                ValidationIssue(
                    'cuves_principales.csv', idx, 'site', 'Champ obligatoire manquant : site'
                )
            )
        if not capacite:
            result.add(
                ValidationIssue(
                    'cuves_principales.csv',
                    idx,
                    'capacite',
                    'Champ obligatoire manquant : capacite',
                )
            )
        code = normalize_cp_code(raw) if raw else None
        if raw and not code:
            result.add(
                ValidationIssue(
                    'cuves_principales.csv',
                    idx,
                    'identifiant',
                    f'Identifiant CP invalide « {raw} » (attendu CPxxx, ex. CP001)',
                )
            )
        elif code:
            if code in seen:
                result.add(
                    ValidationIssue(
                        'cuves_principales.csv',
                        idx,
                        'identifiant',
                        f'Identifiant en double : {code}',
                    )
                )
            seen.add(code)
    return result


def validate_groupes(rows: list[dict]) -> ValidationResult:
    result = ValidationResult()
    seen = set()
    for idx, row in enumerate(rows, start=2):
        ident = to_str(cell(row, 'identifiant', 'id_groupe', 'groupe'))
        if not ident:
            result.add(
                ValidationIssue(
                    'groupes.csv', idx, 'identifiant', 'Champ obligatoire manquant : identifiant'
                )
            )
        else:
            key = ident.upper()
            if key in seen:
                result.add(
                    ValidationIssue('groupes.csv', idx, 'identifiant', f'Groupe en double : {ident}')
                )
            seen.add(key)
        if to_str(cell(row, 'marque')) is None:
            result.add(
                ValidationIssue('groupes.csv', idx, 'marque', 'Champ obligatoire manquant : marque')
            )
        if to_str(cell(row, 'puissance')) is None:
            result.add(
                ValidationIssue(
                    'groupes.csv', idx, 'puissance', 'Champ obligatoire manquant : puissance'
                )
            )
    return result


def validate_cuves_journalieres(rows: list[dict]) -> ValidationResult:
    result = ValidationResult()
    seen = set()
    for idx, row in enumerate(rows, start=2):
        raw = to_str(cell(row, 'identifiant', 'id_cuve_journaliere', 'cuve_journaliere'))
        cp = to_str(cell(row, 'cuve_principale', 'id_cuve_principale', 'site'))
        capacite = to_str(cell(row, 'capacite'))
        if not raw:
            result.add(
                ValidationIssue(
                    'cuves_journalieres.csv',
                    idx,
                    'identifiant',
                    'Champ obligatoire manquant : identifiant',
                )
            )
        if not cp:
            result.add(
                ValidationIssue(
                    'cuves_journalieres.csv',
                    idx,
                    'cuve_principale',
                    'Champ obligatoire manquant : cuve_principale',
                )
            )
        if not capacite:
            result.add(
                ValidationIssue(
                    'cuves_journalieres.csv',
                    idx,
                    'capacite',
                    'Champ obligatoire manquant : capacite',
                )
            )
        code = normalize_cj_code(raw) if raw else None
        if raw and not code:
            result.add(
                ValidationIssue(
                    'cuves_journalieres.csv',
                    idx,
                    'identifiant',
                    f'Identifiant CJ invalide « {raw} » (attendu CJxxx, ex. CJ001)',
                )
            )
        elif code:
            if code in seen:
                result.add(
                    ValidationIssue(
                        'cuves_journalieres.csv',
                        idx,
                        'identifiant',
                        f'Cuve journalière en double : {code}',
                    )
                )
            seen.add(code)
        if cp and not normalize_cp_code(cp):
            result.add(
                ValidationIssue(
                    'cuves_journalieres.csv',
                    idx,
                    'cuve_principale',
                    f'« {cp} » n’est pas un code CPxxx — résolution par nom de site',
                    level='warning',
                )
            )
    return result


def validate_cuve_journaliere_groupe(rows: list[dict]) -> ValidationResult:
    result = ValidationResult()
    seen_cj = set()
    for idx, row in enumerate(rows, start=2):
        raw_cj = to_str(cell(row, 'cuve_journaliere', 'id_cuve_journaliere', 'identifiant'))
        raw_g = to_str(cell(row, 'groupe', 'id_groupe'))
        if not raw_cj:
            result.add(
                ValidationIssue(
                    'cuve_journaliere_groupe.csv',
                    idx,
                    'cuve_journaliere',
                    'Champ obligatoire manquant : cuve_journaliere',
                )
            )
        if not raw_g:
            result.add(
                ValidationIssue(
                    'cuve_journaliere_groupe.csv',
                    idx,
                    'groupe',
                    'Champ obligatoire manquant : groupe',
                )
            )
        code = normalize_cj_code(raw_cj) if raw_cj else None
        if raw_cj and not code:
            result.add(
                ValidationIssue(
                    'cuve_journaliere_groupe.csv',
                    idx,
                    'cuve_journaliere',
                    f'Identifiant CJ invalide « {raw_cj} » (attendu CJxxx)',
                )
            )
        elif code:
            if code in seen_cj:
                result.add(
                    ValidationIssue(
                        'cuve_journaliere_groupe.csv',
                        idx,
                        'cuve_journaliere',
                        f'CJ déjà liée : {code}',
                    )
                )
            seen_cj.add(code)
    return result


def validate_lignes_rapport(rows: list[dict]) -> ValidationResult:
    result = ValidationResult()
    for idx, row in enumerate(rows, start=2):
        _require(
            result,
            'lignes_rapport.csv',
            idx,
            row,
            'date_debut',
            'date_fin',
            'cuve_journaliere',
        )
        # au moins CP ou site + groupe
        if not to_str(cell(row, 'cuve_principale', 'site')):
            result.add(
                ValidationIssue(
                    'lignes_rapport.csv',
                    idx,
                    'cuve_principale',
                    'cuve_principale (CPxxx) ou site manquant',
                )
            )
        if not to_str(cell(row, 'groupe', 'id_groupe', 'groupe_marque')):
            result.add(
                ValidationIssue('lignes_rapport.csv', idx, 'groupe', 'groupe manquant')
            )
    return result


def merge_results(*results: ValidationResult) -> ValidationResult:
    merged = ValidationResult()
    for result in results:
        for issue in result.issues:
            merged.add(issue)
    return merged
