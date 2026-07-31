"""
Détection des alertes métier à partir des calculs groupes.

Appelée au dépôt d’une fiche (import rapport) et via `manage.py detect_alertes`.
Les alertes actives sont upsertées ; celles dont la condition a disparu sont
passées en « ignorée » (sauf déjà traitées).
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

from apps.api.services import calculs as calc
from apps.alerts.models import Alerte
from apps.reports.models import LigneRapport
from apps.sites.models import CuvePrincipale, GroupeElectrogene

logger = logging.getLogger(__name__)

SEUIL_AUTONOMIE_CRITIQUE_H = 24.0
SEUIL_AUTONOMIE_PREVENTIVE_H = 72.0
SEUIL_ECART_CONSO_PCT = 15.0

TYPES_DETECTES = (
    'autonomie_critique',
    'autonomie_preventive',
    'conso_sans_horaire',
    'ecart_conso',
)


def _last_period_value(series, default=0.0):
    if not series:
        return default
    value = series[-1]
    if value is None:
        return default
    return float(value)


def _site_display_name(cuve_principale):
    if cuve_principale is None:
        return ''
    related = getattr(cuve_principale, 'site', None)
    if related is not None and getattr(related, 'nom', None):
        return related.nom
    return getattr(cuve_principale, 'identifiant', '') or str(cuve_principale.pk)


def load_group_blocks():
    """Reconstruit les blocs groupes (même logique que le dashboard)."""
    reports = calc.ordered_rapports()
    sites = list(CuvePrincipale.objects.select_related('site').order_by('id'))
    groups = list(
        GroupeElectrogene.objects.select_related(
            'cuve_journaliere',
            'cuve_journaliere__cuve_principale',
            'cuve_journaliere__cuve_principale__site',
        ).order_by('id')
    )
    report_ids = [r.id for r in reports]

    lignes_all = list(
        LigneRapport.objects.filter(rapport_id__in=report_ids)
        .select_related('cuve_journaliere', 'cuve_principale', 'groupe_electrogene')
    )

    lines_by_site_report = {}
    for line in lignes_all:
        site_ids = set()
        if line.cuve_principale_id:
            site_ids.add(line.cuve_principale_id)
        if (
            line.cuve_journaliere_id
            and line.cuve_journaliere
            and line.cuve_journaliere.cuve_principale_id
        ):
            site_ids.add(line.cuve_journaliere.cuve_principale_id)
        for sid in site_ids:
            lines_by_site_report.setdefault((sid, line.rapport_id), []).append(line)

    lines_by_group_report = {}
    for line in lignes_all:
        if line.groupe_electrogene_id:
            lines_by_group_report.setdefault(
                (line.groupe_electrogene_id, line.rapport_id), []
            ).append(line)

    group_site_counts = {}
    for line in lignes_all:
        if line.groupe_electrogene_id and line.cuve_principale_id:
            counts = group_site_counts.setdefault(line.groupe_electrogene_id, {})
            counts[line.cuve_principale_id] = counts.get(line.cuve_principale_id, 0) + 1
    group_primary_site_ids = {
        gid: max(counts.items(), key=lambda item: item[1])[0]
        for gid, counts in group_site_counts.items()
    }

    groups_by_site_report = {}
    for line in lignes_all:
        if line.cuve_principale_id and line.groupe_electrogene_id:
            groups_by_site_report.setdefault(
                (line.cuve_principale_id, line.rapport_id), set()
            ).add(line.groupe_electrogene_id)

    groupes_by_id = {g.id: g for g in groups}
    site_report_state = calc.build_site_report_state(reports, sites, lines_by_site_report)

    group_blocks = calc.calculer_groupes(
        reports=reports,
        groupes=groups,
        sites=sites,
        lines_by_group_report=lines_by_group_report,
        site_report_state=site_report_state,
        groups_by_site_report=groups_by_site_report,
        groupes_by_id=groupes_by_id,
        group_primary_site_ids=group_primary_site_ids,
        selected_site_id=None,
    )
    return reports, sites, groups, group_blocks


def _resolve_refs(block, groupes_by_id, sites_by_cp_id):
    groupe = groupes_by_id.get(block.get('id'))
    cp_id = block.get('site_id')
    cp = sites_by_cp_id.get(cp_id) if cp_id is not None else None
    site = getattr(cp, 'site', None) if cp is not None else None
    cuve_j = getattr(groupe, 'cuve_journaliere', None) if groupe is not None else None
    return groupe, cp, site, cuve_j


def _upsert_active(cle, **fields):
    """Crée ou met à jour une alerte active. Ne touche pas aux alertes traitées.

    Returns:
        (alerte, should_notify): should_notify si création ou réactivation.
    """
    existing = Alerte.objects.filter(cle=cle).first()
    if existing is None:
        return Alerte.objects.create(cle=cle, **fields), True

    if existing.etat == 'traitee':
        return existing, False

    was_reactivated = existing.etat == 'ignoree'
    for key, value in fields.items():
        setattr(existing, key, value)
    if was_reactivated:
        existing.etat = 'nouvelle'
        existing.justification = ''
        existing.traite_par = None
        existing.date_traitement = None
    existing.save()
    return existing, was_reactivated


def _candidates_from_block(block, groupe, cp, site, cuve_j):
    """Retourne la liste des alertes à créer pour un bloc groupe."""
    candidates = []
    gid = groupe.id if groupe else block.get('id')
    if gid is None:
        return candidates

    label = block.get('label') or (groupe.identifiant if groupe else f'#{gid}')
    site_name = block.get('site_nom') or block.get('site_name') or _site_display_name(cp)
    cp_id = cp.id if cp else block.get('site_id')
    base_ctx = {
        'groupe_id': gid,
        'groupe_label': label,
        'cuve_principale_id': cp_id,
        'site_name': site_name,
    }

    autonomie = block.get('autonomie_hours')
    is_infinite_autonomy = bool(block.get('is_infinite_autonomy'))

    if not is_infinite_autonomy and autonomie is not None:
        if autonomie < SEUIL_AUTONOMIE_CRITIQUE_H:
            candidates.append({
                'cle': Alerte.generer_cle('autonomie_critique', gid),
                'type_alerte': 'autonomie_critique',
                'priorite': 'critique',
                'message': (
                    f'Autonomie carburant inférieure à 24h : '
                    f'{autonomie:.1f}h restantes — Groupe {label}'
                    + (f' ({site_name})' if site_name else '')
                ),
                'donnees_contexte': {
                    **base_ctx,
                    'autonomie_heures': autonomie,
                    'seuil': SEUIL_AUTONOMIE_CRITIQUE_H,
                },
            })
        elif autonomie < SEUIL_AUTONOMIE_PREVENTIVE_H:
            candidates.append({
                'cle': Alerte.generer_cle('autonomie_preventive', gid),
                'type_alerte': 'autonomie_preventive',
                'priorite': 'basse',
                'message': (
                    f'Autonomie carburant inférieure à 72h : '
                    f'{autonomie:.1f}h restantes — Groupe {label}'
                    + (f' ({site_name})' if site_name else '')
                ),
                'donnees_contexte': {
                    **base_ctx,
                    'autonomie_heures': autonomie,
                    'seuil': SEUIL_AUTONOMIE_PREVENTIVE_H,
                },
            })

    latest_consumption = _last_period_value(block.get('consumption'), 0.0)
    latest_hours = _last_period_value(block.get('hours_run'), 0.0)
    if latest_consumption > 0 and not (latest_hours > 0):
        candidates.append({
            'cle': Alerte.generer_cle('conso_sans_horaire', gid),
            'type_alerte': 'conso_sans_horaire',
            'priorite': 'haute',
            'message': (
                'Consommation enregistrée sans relevé du compteur horaire '
                f'— Groupe {label}'
                + (f' ({site_name})' if site_name else '')
            ),
            'donnees_contexte': {
                **base_ctx,
                'quantite_conso': latest_consumption,
                'compteur_horaire': latest_hours,
            },
        })

    mean = float(block.get('mean_hourly_consumption_deduite') or 0.0)
    latest_hourly = block.get('latest_hourly_consumption')
    if mean > 0 and latest_hourly is not None:
        ecart = abs((float(latest_hourly) - mean) / mean) * 100
        if ecart > SEUIL_ECART_CONSO_PCT:
            candidates.append({
                'cle': Alerte.generer_cle('ecart_conso', gid),
                'type_alerte': 'ecart_conso',
                'priorite': 'moyenne',
                'message': (
                    f'Écart de consommation de {ecart:.1f}% détecté '
                    f'— Groupe {label}'
                    + (f' ({site_name})' if site_name else '')
                ),
                'donnees_contexte': {
                    **base_ctx,
                    'ecart_pourcent': round(ecart, 1),
                    'mean_hourly': round(mean, 2),
                    'latest_hourly': round(float(latest_hourly), 2),
                },
            })

    for item in candidates:
        item['site'] = site
        item['cuve_journaliere'] = cuve_j
        item['groupe_electrogene'] = groupe
    return candidates


def _candidates_from_site_blocks(group_blocks, sites_by_cp_id):
    """
    Alertes « site urgent » (< 24 h ou 0 h) — une alerte critique par site.
    Complète les alertes groupe : le compteur Sites urgents du dashboard
    correspond ainsi à des alertes persistées (priorité critique).
    """
    by_site: dict = {}
    for block in group_blocks:
        sid = block.get('site_id')
        if sid is None:
            continue
        by_site.setdefault(sid, []).append(block)

    candidates = []
    for sid, blocks in by_site.items():
        cp = sites_by_cp_id.get(sid)
        site = getattr(cp, 'site', None) if cp is not None else None
        site_name = _site_display_name(cp)

        finite = [
            float(b['autonomie_hours'])
            for b in blocks
            if b.get('autonomie_hours') is not None and not b.get('is_infinite_autonomy')
        ]
        any_infinite_cons = any(b.get('is_infinite_consumption') for b in blocks)

        if finite:
            aut_hours = round(max(finite), 1)
            is_inf_cons = False
        elif any_infinite_cons:
            aut_hours = 0.0
            is_inf_cons = True
        else:
            continue  # ∞ : pas d’alerte site

        if not is_inf_cons and aut_hours >= SEUIL_AUTONOMIE_CRITIQUE_H:
            continue

        if is_inf_cons:
            message = (
                'Site urgent — autonomie critique : 0 h '
                '(consommation sans delta horaire)'
                + (f' — {site_name}' if site_name else '')
            )
        else:
            message = (
                f'Site urgent — autonomie critique : {aut_hours:.1f}h restantes'
                + (f' — {site_name}' if site_name else '')
            )

        candidates.append({
            'cle': Alerte.generer_cle('autonomie_critique', sid, prefix='site'),
            'type_alerte': 'autonomie_critique',
            'priorite': 'critique',
            'message': message,
            'donnees_contexte': {
                'cuve_principale_id': sid,
                'site_name': site_name,
                'autonomie_heures': aut_hours,
                'seuil': SEUIL_AUTONOMIE_CRITIQUE_H,
                'is_site_urgent': True,
                'is_infinite_consumption': is_inf_cons,
            },
            'site': site,
            'groupe_electrogene': None,
            'cuve_journaliere': None,
        })
    return candidates


@transaction.atomic
def detecter_et_persister_alertes(*, auto_ignorer_levees: bool = True):
    """
    Parcourt tous les groupes (et sites urgents), crée/met à jour les alertes en BD.

    Returns:
        dict: compteurs created / updated / ignored / active_keys
    """
    _reports, sites, groups, group_blocks = load_group_blocks()
    groupes_by_id = {g.id: g for g in groups}
    sites_by_cp_id = {s.id: s for s in sites}

    active_keys = set()
    created = updated = 0

    for block in group_blocks:
        groupe, cp, site, cuve_j = _resolve_refs(block, groupes_by_id, sites_by_cp_id)
        for payload in _candidates_from_block(block, groupe, cp, site, cuve_j):
            cle = payload.pop('cle')
            active_keys.add(cle)
            _alerte, should_notify = _upsert_active(cle, **payload)
            if should_notify:
                created += 1
            else:
                updated += 1

    for payload in _candidates_from_site_blocks(group_blocks, sites_by_cp_id):
        cle = payload.pop('cle')
        active_keys.add(cle)
        _alerte, should_notify = _upsert_active(cle, **payload)
        if should_notify:
            created += 1
        else:
            updated += 1

    ignored = 0
    if auto_ignorer_levees:
        stale_qs = Alerte.objects.filter(
            type_alerte__in=TYPES_DETECTES,
            etat__in=Alerte.ETATS_ACTIFS,
        ).exclude(cle__isnull=True).exclude(cle='')
        for alerte in stale_qs:
            if alerte.cle not in active_keys:
                alerte.marquer_ignoree(
                    justification='Condition levée automatiquement après nouveau relevé.'
                )
                ignored += 1

    logger.info(
        'Alertes détectées: created=%s updated=%s ignored=%s actives=%s',
        created,
        updated,
        ignored,
        len(active_keys),
    )
    return {
        'created': created,
        'updated': updated,
        'ignored': ignored,
        'active': len(active_keys),
        'notified': 0,
        'detected_at': timezone.now().isoformat(),
    }
