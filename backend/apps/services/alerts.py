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

from apps.services import calculs as calc
from apps.services.calculs import should_emit_hourly_variance_alert
from apps.alerts.models import Alerte
from apps.reports.models import LigneRapport
from apps.equipment.models import CuvePrincipale, GroupeElectrogene

logger = logging.getLogger(__name__)

SEUIL_AUTONOMIE_CRITIQUE_H = 24.0
SEUIL_AUTONOMIE_PREVENTIVE_H = 36.0
SEUIL_ECART_CONSO_PCT = 15.0

TYPES_DETECTES = (
    'autonomie_critique',
    'autonomie_preventive',
    'conso_sans_fonctionnement',
    'fonctionnement_sans_consommation',
    'ecart_conso',
    'compteur_incoherent',
)


def _detection_datetime(report):
    """Instant de détection : création de la fiche (rapport), sinon maintenant."""
    created = getattr(report, 'date_creation', None) if report is not None else None
    return created or timezone.now()


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


def _format_counter_value(value):
    try:
        return f'{float(value):.1f}'
    except (TypeError, ValueError):
        return str(value)


def _candidates_from_counter_quality(lignes_all, sites_by_cp_id, groupes_by_id, report_by_id, latest_report):
    candidates = []
    report_date = latest_report.date_fin if latest_report is not None else None

    # Même groupe avec plusieurs valeurs de compteur différentes sur un même rapport.
    group_report_counters = {}
    for line in lignes_all:
        if line.groupe_electrogene_id is None:
            continue
        counter = getattr(line, 'compteur_horaire', None)
        if counter is None:
            continue
        key = (line.groupe_electrogene_id, line.rapport_id)
        group_report_counters.setdefault(key, set()).add(float(counter))

    for (group_id, report_id), counters in group_report_counters.items():
        if len(counters) <= 1:
            continue
        groupe = groupes_by_id.get(group_id)
        label = groupe.identifiant if groupe is not None else str(group_id)
        candidates.append({
            'cle': Alerte.generer_cle(
                'compteur_incoherent',
                group_id,
                prefix='groupe',
                suffix=report_id,
            ),
            'type_alerte': 'compteur_incoherent',
            'priorite': 'haute',
            'message': (
                f'Valeurs de compteur incohérentes pour le groupe {label} '
                f'sur le rapport {report_id} : {sorted(_format_counter_value(c) for c in counters)}.'
            ),
            'donnees_contexte': {
                'groupe_id': group_id,
                'rapport_id': report_id,
                'compteur_horaire_values': sorted(counters),
            },
            'site': None,
            'cuve_journaliere': None,
            'groupe_electrogene': groupe,
            'date_apparition': report_by_id.get(report_id).date_fin if report_id in report_by_id else report_date,
            'date_detection': _detection_datetime(report_by_id.get(report_id) or latest_report),
        })

    return candidates


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

    group_primary_site_ids = calc.build_group_primary_site_ids(groups, lignes_all)

    groups_by_site_report = {}
    for line in lignes_all:
        if line.groupe_electrogene_id:
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
                groups_by_site_report.setdefault((sid, line.rapport_id), set()).add(line.groupe_electrogene_id)

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
    return reports, sites, groups, group_blocks, lignes_all


def _resolve_refs(block, groupes_by_id, sites_by_cp_id):
    groupe = groupes_by_id.get(block.get('id'))
    cp_id = block.get('site_id')
    cp = sites_by_cp_id.get(cp_id) if cp_id is not None else None
    site = getattr(cp, 'site', None) if cp is not None else None
    cuve_j = getattr(groupe, 'cuve_journaliere', None) if groupe is not None else None
    return groupe, cp, site, cuve_j


def _upsert_active(cle, **fields):
    """Crée ou met à jour une alerte active.

    Si la condition réapparait pour la même clé, une alerte traitée ou ignorée
    est rouverte et réactivée. L'instant de détection (`date_detection`) est
    conservé tant que l'alerte reste active ; il est posé à la création et
    rafraîchi à la réouverture.

    Returns:
        (alerte, should_alert): should_alert si création ou réactivation.
    """
    detection = fields.pop('date_detection', None) or timezone.now()

    existing = Alerte.objects.filter(cle=cle).first()
    if existing is None:
        return Alerte.objects.create(cle=cle, date_detection=detection, **fields), True

    should_alert = existing.etat in ('ignoree', 'traitee')

    for key, value in fields.items():
        setattr(existing, key, value)

    if should_alert:
        existing.etat = 'nouvelle'
        existing.justification = ''
        existing.traite_par = None
        existing.date_traitement = None
        existing.date_detection = detection
    elif existing.date_detection is None:
        existing.date_detection = detection

    existing.save()
    return existing, should_alert


def _candidates_from_block(block, groupe, cp, site, cuve_j, latest_report, reports):
    """Retourne la liste des alertes à créer pour un bloc groupe."""
    candidates = []
    report_date = latest_report.date_fin if latest_report is not None else None
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
    stock_actuel = block.get('volume_proportionnel')
    if stock_actuel is None:
        stock_actuel = block.get('latest_main_volume')

    autonomie = block.get('autonomie_hours')
    is_infinite_autonomy = bool(block.get('is_infinite_autonomy'))

    if not is_infinite_autonomy and autonomie is not None:
        if autonomie < SEUIL_AUTONOMIE_CRITIQUE_H:
            candidates.append({
                'cle': Alerte.generer_cle('autonomie_critique', gid),
                'type_alerte': 'autonomie_critique',
                'priorite': 'critique',
                'message': (
                    f'Autonomie inférieure à 24 h : '
                    f'{autonomie:.1f}h restantes — Groupe {label}'
                    + (f' ({site_name})' if site_name else '')
                ),
                'donnees_contexte': {
                    **base_ctx,
                    'autonomie_heures': autonomie,
                    'seuil': SEUIL_AUTONOMIE_CRITIQUE_H,
                    'stock_actuel': stock_actuel,
                },
                'date_detection': _detection_datetime(latest_report),
            })

        elif autonomie < SEUIL_AUTONOMIE_PREVENTIVE_H:
            candidates.append({
                'cle': Alerte.generer_cle('autonomie_preventive', gid),
                'type_alerte': 'autonomie_preventive',
                'priorite': 'moyenne',
                'message': (
                    f'Autonomie inférieure à 36 h : '
                    f'{autonomie:.1f}h restantes — Groupe {label}'
                    + (f' ({site_name})' if site_name else '')
                ),
                'donnees_contexte': {
                    **base_ctx,
                    'autonomie_heures': autonomie,
                    'seuil': SEUIL_AUTONOMIE_PREVENTIVE_H,
                    'stock_actuel': stock_actuel,
                },
                'date_detection': _detection_datetime(latest_report),
            })

    consumption_series = block.get('consumption') or []
    hours_series = block.get('hours_run') or []

    # 1. Consommation enregistrée sans relevé du compteur horaire (par rapport)
    for idx, report in enumerate(reports):
        c = consumption_series[idx] if idx < len(consumption_series) else None
        h = hours_series[idx] if idx < len(hours_series) else None
        if c is not None and float(c) > 0 and not (h is not None and float(h) > 0):
            c_val = float(c)
            h_val = float(h) if h is not None else 0.0
            candidates.append({
                'cle': Alerte.generer_cle('conso_sans_fonctionnement', gid, suffix=report.id),
                'type_alerte': 'conso_sans_fonctionnement',
                'priorite': 'haute',
                'message': (
                    'Consommation sans fonctionnement '
                    f'— Groupe {label}'
                    + (f' ({site_name})' if site_name else '')
                ),
                'donnees_contexte': {
                    **base_ctx,
                    'rapport_id': report.id,
                    'quantite_conso': c_val,
                    'compteur_horaire': h_val,
                    'date_rapport': report.date_fin.isoformat() if report.date_fin else None,
                },
                'date_apparition': report.date_fin,
                'date_detection': _detection_datetime(report),
            })

    # 2. Delta horaire élevé sans consommation enregistrée (par rapport)
    for idx, report in enumerate(reports):
        c = consumption_series[idx] if idx < len(consumption_series) else None
        h = hours_series[idx] if idx < len(hours_series) else None
        if h is not None and float(h) > 0 and not (c is not None and float(c) > 0):
            c_val = float(c) if c is not None else 0.0
            h_val = float(h)
            candidates.append({
                'cle': Alerte.generer_cle('fonctionnement_sans_consommation', gid, suffix=report.id),
                'type_alerte': 'fonctionnement_sans_consommation',
                'priorite': 'haute',
                'message': (
                    'Fonctionnement sans consommation '
                    f'— Groupe {label}'
                    + (f' ({site_name})' if site_name else '')
                    + f' ({h_val:.1f} h / {c_val:.1f} L)'
                ),
                'donnees_contexte': {
                    **base_ctx,
                    'rapport_id': report.id,
                    'quantite_conso': c_val,
                    'compteur_horaire': h_val,
                    'date_rapport': report.date_fin.isoformat() if report.date_fin else None,
                },
                'date_apparition': report.date_fin,
                'date_detection': _detection_datetime(report),
            })

    # 3. Écart de consommation horaire > 15% (par rapport, référence semaine N-1)
    valid_pairs = []
    for idx, report in enumerate(reports):
        c = consumption_series[idx] if idx < len(consumption_series) else None
        h = hours_series[idx] if idx < len(hours_series) else None
        if c is not None and float(c) > 0 and h is not None and float(h) > 0:
            valid_pairs.append((idx, report, float(c), float(h)))

    if len(valid_pairs) >= 2:
        historical_rates = []
        for idx, report, c_val, h_val in valid_pairs:
            hourly = c_val / h_val
            if not historical_rates:
                historical_rates.append((hourly, report))
                continue

            previous_rate, previous_report = historical_rates[-1]
            ecart = abs((hourly - previous_rate) / previous_rate) * 100
            if should_emit_hourly_variance_alert(previous_rate, hourly, SEUIL_ECART_CONSO_PCT):
                candidates.append({
                    'cle': Alerte.generer_cle('ecart_conso', gid, suffix=report.id),
                    'type_alerte': 'ecart_conso',
                    'priorite': 'moyenne',
                    'message': (
                        f'Écart de consommation de {ecart:.1f}% détecté '
                        f'— Groupe {label}'
                        + (f' ({site_name})' if site_name else '')
                    ),
                    'donnees_contexte': {
                        **base_ctx,
                        'rapport_id': report.id,
                        'ecart_pourcent': round(ecart, 1),
                        'previous_hourly': round(previous_rate, 2),
                        'latest_hourly': round(hourly, 2),
                        'date_rapport_courant': (
                            report.date_fin.isoformat() if report.date_fin else None
                        ),
                        'date_rapport_reference': (
                            previous_report.date_fin.isoformat()
                            if previous_report is not None and previous_report.date_fin
                            else None
                        ),
                    },
                    'date_apparition': report.date_fin,
                    'date_detection': _detection_datetime(report),
                })

            historical_rates.append((hourly, report))

    report_date = latest_report.date_fin if latest_report is not None else None
    for item in candidates:
        item['site'] = site
        item['cuve_journaliere'] = cuve_j
        item['groupe_electrogene'] = groupe
        item.setdefault('date_apparition', report_date)
        item.setdefault('date_detection', _detection_datetime(latest_report))
    return candidates


def _candidates_from_site_blocks(group_blocks, sites_by_cp_id, latest_report):
    """
    Alertes « site urgent » (< 24 h d’autonomie chiffrée) — une alerte critique par site.
    Les sites en autonomie indéterminée (conso sans delta horaire) ou sans fonctionnement
    ne génèrent PAS d’alerte d’urgence.
    """
    by_site: dict = {}
    for block in group_blocks:
        sid = block.get('site_id')
        if sid is None:
            continue
        by_site.setdefault(sid, []).append(block)

    candidates = []
    report_date = latest_report.date_fin if latest_report is not None else None
    for sid, blocks in by_site.items():
        cp = sites_by_cp_id.get(sid)
        site = getattr(cp, 'site', None) if cp is not None else None
        site_name = _site_display_name(cp)

        # Autonomie saine uniquement (hors indéterminée / sans fonctionnement)
        finite = [
            float(b['autonomie_hours'])
            for b in blocks
            if b.get('autonomie_hours') is not None
            and not b.get('is_infinite_autonomy')
            and not b.get('is_infinite_consumption')
            and not b.get('is_sans_fonctionnement')
        ]

        if finite:
            aut_hours = round(max(finite), 1)
            if aut_hours < SEUIL_AUTONOMIE_CRITIQUE_H:
                stock_site = sum(
                    float(b.get('volume_proportionnel') or 0) for b in blocks
                )
                message = (
                    f'Site urgent — Autonomie inférieure à 24 h : {aut_hours:.1f}h restantes'
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
                        'stock_actuel': round(stock_site, 1),
                        'is_site_urgent': True,
                        'is_infinite_consumption': False,
                    },
                    'site': site,
                    'groupe_electrogene': None,
                    'cuve_journaliere': None,
                    'date_apparition': report_date,
                    'date_detection': _detection_datetime(latest_report),
                })

        # Aucun autre type d'alerte site n'est généré ici ; seul le site urgent
        # avec autonomie critique est conservé.

    return candidates


@transaction.atomic
def detecter_et_persister_alertes(*, auto_ignorer_levees: bool = True):
    """
    Parcourt tous les groupes (et sites urgents), crée/met à jour les alertes en BD.

    Returns:
        dict: compteurs created / updated / ignored / active_keys
    """
    _reports, sites, groups, group_blocks, lignes_all = load_group_blocks()
    report_by_id = {r.id: r for r in _reports}
    latest_report = _reports[-1] if _reports else None
    groupes_by_id = {g.id: g for g in groups}
    sites_by_cp_id = {s.id: s for s in sites}

    active_keys = set()
    created = updated = 0

    for block in group_blocks:
        groupe, cp, site, cuve_j = _resolve_refs(block, groupes_by_id, sites_by_cp_id)
        for payload in _candidates_from_block(block, groupe, cp, site, cuve_j, latest_report, _reports):
            cle = payload.pop('cle')
            active_keys.add(cle)
            _alerte, should_alert = _upsert_active(cle, **payload)
            if should_alert:
                created += 1
            else:
                updated += 1

    for payload in _candidates_from_counter_quality(
        lignes_all,
        sites_by_cp_id,
        groupes_by_id,
        report_by_id,
        latest_report,
    ):
        cle = payload.pop('cle')
        active_keys.add(cle)
        _alerte, should_alert = _upsert_active(cle, **payload)
        if should_alert:
            created += 1
        else:
            updated += 1

    for payload in _candidates_from_site_blocks(group_blocks, sites_by_cp_id, latest_report):
        cle = payload.pop('cle')
        active_keys.add(cle)
        _alerte, should_alert = _upsert_active(cle, **payload)
        if should_alert:
            created += 1
        else:
            updated += 1

    ignored = 0
    if auto_ignorer_levees:
        # Seules les alertes de stock (autonomie) s'auto-extinguent quand le niveau remonte.
        # Les anomalies de données (conso sans horaire, horaire sans conso, écart) restent à traiter par l'opérateur.
        stale_qs = Alerte.objects.filter(
            type_alerte__in=('autonomie_critique', 'autonomie_preventive'),
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


def serialize_dashboard_alerts(alerts):
    """
    Transforme une liste d'alertes en payloads simplifiés pour le frontend.
    Titres / sous-titres figés des 5 typologies (même grille que la page Alertes).
    """
    from apps.alerts.serializers import AlerteListSerializer

    priority_map = {
        'critique': 'critical',
        'haute': 'critical',
        'moyenne': 'medium',
        'basse': 'low',
    }

    list_serializer = AlerteListSerializer()
    results = []
    for a in alerts:
        ctx = getattr(a, 'donnees_contexte', None) or {}
        is_group_alert = getattr(a, 'groupe_electrogene_id', None) or ctx.get('groupe_id')

        results.append({
            'id': a.cle,
            'type': a.type_alerte,
            'target': 'groups' if is_group_alert else 'site',
            'site_id': list_serializer.get_site_id(a),
            'site_name': list_serializer.get_site_name(a),
            'group_id': list_serializer.get_group_id(a),
            'group_label': list_serializer.get_group_label(a),
            'priority': a.get_priorite_display(),
            'priority_level': priority_map.get(a.priorite, 'medium'),
            'title': list_serializer.get_title(a),
            'subtitle': list_serializer.get_subtitle(a),
            'detected_at': list_serializer.get_detected_at(a),
            'ecart_pct': list_serializer.get_ecart_pct(a),
            'donnees_contexte': a.donnees_contexte,
        })
    return results
