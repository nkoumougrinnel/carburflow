"""Calculs métier partagés pour les vues dashboard et API."""

import re

# ─────────────────────────────────────────────────────────────
# 1. FONCTIONS UTILITAIRES
# ─────────────────────────────────────────────────────────────

def format_rapport_label(report) -> str:
    """Libellé période pour filtres / axes : date de début (jj/mm/aaaa)."""
    return report.date_debut.strftime('%d/%m/%Y')


def ordered_rapports(queryset=None):
    """Liste des rapports en ordre chronologique strict."""
    from apps.reports.models import Rapport
    qs = queryset if queryset is not None else Rapport.objects.all()
    return list(qs.order_by('date_debut', 'date_fin', 'id'))


def extraire_puissance(value):
    """Extrait la valeur numérique d'une puissance."""
    if value in (None, ''):
        return 0.0
    text = str(value).strip().replace(',', '.')
    match = re.search(r'(\d+(?:\.\d+)?)', text)
    return float(match.group(1)) if match else 0.0


def formater_autonomie(heures):
    """Formate une autonomie en heures en format lisible."""
    if heures is None:
        return "∞"
    if heures == 0:
        return "0h"
    t_mins = round(heures * 60)
    t_hrs = round(t_mins / 60)
    days = t_hrs // 24
    rem_h = t_hrs % 24
    return f"{days}j{rem_h}h" if days > 0 else f"{rem_h}h"


def moyenne(values):
    """Calcule la moyenne d'une liste de valeurs (ignore None)."""
    nums = [float(v) for v in values if v is not None]
    return sum(nums) / len(nums) if nums else 0.0


def moyenne_positive(values):
    """Calcule la moyenne des valeurs positives uniquement."""
    nums = [float(v) for v in values if v is not None and float(v) > 0]
    return sum(nums) / len(nums) if nums else 0.0


def ecart_type(values):
    """Calcule l'écart type d'une liste de valeurs (ignore None)."""
    nums = [v for v in values if v is not None]
    if not nums:
        return 0.0
    mean = moyenne(nums)
    variance = sum((v - mean) ** 2 for v in nums) / len(nums)
    return variance ** 0.5


def last_finite(values):
    """Dernière valeur non-null d'une série."""
    for value in reversed(values or []):
        if value is not None:
            return value
    return None


def last_numeric(values, default=0.0):
    """Dernière valeur numérique d'une série."""
    for value in reversed(values or []):
        if value is not None:
            return round(float(value), 1)
    return round(float(default), 1)


def previous_numeric(values, default=0.0):
    """Avant-dernière valeur numérique d'une série."""
    if not values:
        return default
    last_idx = None
    for i in range(len(values) - 1, -1, -1):
        if values[i] is not None:
            last_idx = i
            break
    if last_idx is None:
        return default
    for i in range(last_idx - 1, -1, -1):
        if values[i] is not None:
            return round(float(values[i]), 1)
    return default


def numeric_values(values, positive_only=False):
    """Filtre et convertit une série en nombres."""
    out = []
    for v in values or []:
        if v is None:
            continue
        num = float(v)
        if positive_only and num <= 0:
            continue
        out.append(num)
    return out


# ─────────────────────────────────────────────────────────────
# 2. VOLUME, CONSOMMATION, DÉPOTAGE (NIVEAU SITE)
# ─────────────────────────────────────────────────────────────

def _line_belongs_to_site(line, site_id):
    """Vrai si une ligne relève bien le site demandé, y compris via une CJ liée."""
    if site_id is None:
        return True
    if getattr(line, 'cuve_principale_id', None) == site_id:
        return True
    cj = getattr(line, 'cuve_journaliere', None)
    return getattr(cj, 'cuve_principale_id', None) == site_id


def _site_volume_from_lines(lines) -> float:
    """
    Volume du site = stock réel de la cuve principale (une seule lecture).
    Chaque ligne répète le même volume CP : on prend le max.
    """
    cp_values = [
        float(l.quantite_gasoil_cuve_principale)
        for l in lines
        if l.quantite_gasoil_cuve_principale is not None
    ]
    return max(cp_values) if cp_values else 0.0


def _site_cj_volume_from_lines(lines) -> float:
    """Somme des stocks des cuves journalières présentes sur les lignes du site."""
    return sum(float(getattr(l, 'quantite_gasoil_cuve_journaliere', None) or 0.0) for l in lines)


def _site_depotage_from_lines(lines) -> float:
    """
    Dépotage site : valeur unique pour tout le site.
    🔧 CORRECTION : on prend la valeur maximale (pas la somme).
    """
    values = [
        float(l.depotage or 0.0)
        for l in lines
        if l.depotage is not None and l.depotage != 0.0
    ]
    return max(values) if values else 0.0


def _consommation_periode(
    previous_cp: float,
    previous_cj: float,
    current_cp: float,
    current_cj: float,
    depotage: float,
) -> float:
    """
    Consommation réelle sur la période.
    Stock global = CP + Σ CJ → annule l'effet des prélèvements internes CP→CJ.
    """
    prev_total = float(previous_cp) + float(previous_cj)
    curr_total = float(current_cp) + float(current_cj)
    return prev_total - curr_total + float(depotage or 0.0)


# ─────────────────────────────────────────────────────────────
# 3. SITE PRINCIPAL D'UN GROUPE
# ─────────────────────────────────────────────────────────────

def build_group_primary_site_ids(groups, lignes_all):
    """
    Détermine le site principal d'un groupe :
      1. Rattachement via Cuve Journalière (priorité 1)
      2. Rattachement via les lignes de rapport (priorité 2)
    """
    primary_site_ids = {}

    # 1. Rattachement CJ
    for groupe in groups or []:
        cj = getattr(groupe, 'cuve_journaliere', None)
        cp_id = getattr(cj, 'cuve_principale_id', None)
        if cp_id is not None:
            primary_site_ids[groupe.id] = cp_id

    # 2. Rattachement par lignes
    counts_by_group_site = {}
    for line in lignes_all or []:
        gid = getattr(line, 'groupe_electrogene_id', None)
        if gid is None:
            continue
        site_ids = set()
        if getattr(line, 'cuve_principale_id', None) is not None:
            site_ids.add(line.cuve_principale_id)
        cj = getattr(line, 'cuve_journaliere', None)
        cp_id = getattr(cj, 'cuve_principale_id', None)
        if cp_id is not None:
            site_ids.add(cp_id)
        for sid in site_ids:
            counts = counts_by_group_site.setdefault(gid, {})
            counts[sid] = counts.get(sid, 0) + 1

    # 3. Pour les groupes sans CJ, prendre le site le plus fréquent
    for gid, counts in counts_by_group_site.items():
        if gid in primary_site_ids:
            continue
        if counts:
            primary_site_ids[gid] = max(counts.items(), key=lambda item: item[1])[0]

    return primary_site_ids


# ─────────────────────────────────────────────────────────────
# 4. DÉTECTION DES ANOMALIES
# ─────────────────────────────────────────────────────────────

def should_emit_hourly_variance_alert(mean_hourly_consumption, observed_hourly_consumption, threshold_pct=15.0):
    """Vrai si un écart de consommation horaire dépasse le seuil."""
    mean_value = float(mean_hourly_consumption or 0.0)
    observed_value = float(observed_hourly_consumption or 0.0)
    if mean_value <= 0.0 or observed_value <= 0.0:
        return False
    ecart = abs((observed_value - mean_value) / mean_value) * 100
    return ecart > threshold_pct


def should_mark_sans_fonctionnement(latest_hours_n, latest_cons_n, hours_run, consumed_deltas, is_infinite_consumption):
    """
    Vrai si le groupe est réellement au repos sur la période courante.
    Un delta horaire à 0 sur la semaine N n'est pas suffisant s'il y a eu une activité antérieure.
    """
    if is_infinite_consumption:
        return False

    latest_hours = float(latest_hours_n) if latest_hours_n is not None else None
    latest_cons = float(latest_cons_n) if latest_cons_n is not None else None

    if latest_hours is None or latest_hours != 0.0:
        return False
    if latest_cons is None:
        latest_cons = 0.0
    if latest_cons > 0.0:
        return False

    prior_pairs = []
    if len(hours_run) > 1:
        prior_pairs = list(zip(hours_run[:-1], consumed_deltas[:-1]))

    has_previous_activity = any(
        (h is not None and float(h) > 0.0) or (d is not None and float(d) > 0.0)
        for h, d in prior_pairs
    )
    return not has_previous_activity


# ─────────────────────────────────────────────────────────────
# 5. AUTONOMIE
# ─────────────────────────────────────────────────────────────

def resolve_site_autonomy_from_groups(site_groups):
    """
    Résout l'autonomie d'un site à partir des groupes rattachés.
    Règle : on prend le minimum des autonomies chiffrées des groupes valides.
    """
    site_groups = site_groups or []

    valid_hours = [
        g.get('autonomie_hours')
        for g in site_groups
        if g.get('autonomie_hours') is not None
        and not g.get('is_infinite_consumption')
        and not g.get('is_sans_fonctionnement')
        and not g.get('is_infinite_autonomy')
    ]

    if valid_hours:
        aut_hours = round(min(valid_hours), 1)
        return {
            'autonomie_hours': aut_hours,
            'formatted_autonomy': formater_autonomie(aut_hours),
            'is_infinite_consumption': False,
            'is_infinite_autonomy': False,
            'is_sans_fonctionnement': False,
        }

    if any(g.get('is_infinite_consumption') for g in site_groups):
        return {
            'autonomie_hours': None,
            'formatted_autonomy': None,
            'is_infinite_consumption': True,
            'is_infinite_autonomy': False,
            'is_sans_fonctionnement': False,
        }

    if any(g.get('is_sans_fonctionnement') or g.get('is_infinite_autonomy') for g in site_groups):
        return {
            'autonomie_hours': None,
            'formatted_autonomy': None,
            'is_infinite_consumption': False,
            'is_infinite_autonomy': True,
            'is_sans_fonctionnement': True,
        }

    return {
        'autonomie_hours': None,
        'formatted_autonomy': None,
        'is_infinite_consumption': False,
        'is_infinite_autonomy': True,
        'is_sans_fonctionnement': False,
    }


# ─────────────────────────────────────────────────────────────
# 6. CALCUL DES SÉRIES SITE
# ─────────────────────────────────────────────────────────────

def build_site_report_state(reports, sites, lines_by_site_report):
    """
    Prépare l'état volume/delta par (site, rapport) pour le calcul des groupes.
    delta = conso réelle (CP+CJ, prélèvements annulés).
    """
    site_report_state = {}
    for site in sites:
        previous_cp = None
        previous_cj = None
        for report in reports:
            lines = lines_by_site_report.get((site.id, report.id), [])
            if not lines:
                site_report_state[(site.id, report.id)] = {
                    'present': False,
                    'current_volume': None,
                    'delta': None,
                }
                continue

            current_cp = _site_volume_from_lines(lines)
            current_cj = _site_cj_volume_from_lines(lines)
            depotage_total = _site_depotage_from_lines(lines)

            if previous_cp is None:
                delta = 0.0
            else:
                delta = _consommation_periode(
                    previous_cp, previous_cj, current_cp, current_cj, depotage_total
                )

            site_report_state[(site.id, report.id)] = {
                'present': True,
                'current_volume': current_cp,
                'cj_volume': current_cj,
                'delta': delta,
            }
            previous_cp = current_cp
            previous_cj = current_cj

    return site_report_state


def calculer_site_series(reports, lines_by_site_report, site_id):
    """
    Calcule les séries de volume (CP) et consommation (stock global CP+CJ) pour un site.
    Retourne (volume_data, consumption_data).
    """
    volume_data = []
    consumption_data = []
    previous_cp = None
    previous_cj = None

    for report in reports:
        lines = lines_by_site_report.get((site_id, report.id), [])
        if not lines:
            volume_data.append(None)
            consumption_data.append(None)
            continue

        current_cp = _site_volume_from_lines(lines)
        current_cj = _site_cj_volume_from_lines(lines)
        depotage_total = _site_depotage_from_lines(lines)
        volume_data.append(round(current_cp, 1))

        if previous_cp is None:
            consumption_data.append(0.0)
        else:
            consumption_data.append(
                round(
                    _consommation_periode(
                        previous_cp, previous_cj, current_cp, current_cj, depotage_total
                    ),
                    1,
                )
            )
        previous_cp = current_cp
        previous_cj = current_cj

    return volume_data, consumption_data


def somme_conso_groupes(group_blocks: list, n_periods: int) -> list:
    """
    Conso site = somme des consos des groupes agrégés (par période).
    None si aucun groupe n'a de valeur sur la période.
    """
    series = []
    for idx in range(n_periods):
        vals = []
        for block in group_blocks or []:
            consos = block.get('consumption') or []
            if idx < len(consos) and consos[idx] is not None:
                vals.append(float(consos[idx]))
        series.append(round(sum(vals), 1) if vals else None)
    return series


# ─────────────────────────────────────────────────────────────
# 7. CALCUL DES GROUPES (CŒUR MÉTIER)
# ─────────────────────────────────────────────────────────────

def calculer_groupes(
    reports,
    groupes,
    sites,
    lines_by_group_report,
    site_report_state,
    groups_by_site_report,
    groupes_by_id,
    group_primary_site_ids,
    selected_site_id=None,
    groups_linked_by_site=None,
):
    """
    Calcule les données complètes pour chaque groupe avec partage de la
    consommation au prorata de la puissance.

    🔧 CORRECTION AUTONOMIE : utilisation de mean_hourly_consumption_deduite
    (moyenne sur toutes les périodes) au lieu de latest_hourly_consumption.
    """
    # Groupes durablement rattachés à chaque site (via CJ)
    if groups_linked_by_site is None:
        from apps.equipment.models import CuveJournaliere
        groups_linked_by_site = {}
        for cj in CuveJournaliere.objects.filter(
            cuve_principale_id__isnull=False,
            groupe_electrogene_id__isnull=False,
        ).only('cuve_principale_id', 'groupe_electrogene_id'):
            g = groupes_by_id.get(cj.groupe_electrogene_id)
            if g is not None:
                groups_linked_by_site.setdefault(cj.cuve_principale_id, [])
                if g not in groups_linked_by_site[cj.cuve_principale_id]:
                    groups_linked_by_site[cj.cuve_principale_id].append(g)

        # Fallback : sites sans CJ
        for groupe in groupes:
            site_id = group_primary_site_ids.get(groupe.id)
            if site_id is not None:
                bucket = groups_linked_by_site.setdefault(site_id, [])
                if groupe not in bucket:
                    bucket.append(groupe)

    # Correction robuste pour les groupes rattachés via leurs lignes
    for groupe in groupes:
        primary_site_id = group_primary_site_ids.get(groupe.id)
        if primary_site_id is None:
            continue
        bucket = groups_linked_by_site.setdefault(primary_site_id, [])
        if groupe not in bucket:
            bucket.append(groupe)

    # Pré-calcul des deltas horaires
    group_hour_deltas = {}
    for g in groupes:
        p_site_id = group_primary_site_ids.get(g.id)
        prev_c = None
        for r in reports:
            g_lines = lines_by_group_report.get((g.id, r.id), [])
            if p_site_id is not None:
                g_lines = [l for l in g_lines if _line_belongs_to_site(l, p_site_id)]
            s_state = site_report_state.get((p_site_id, r.id), {}) if p_site_id is not None else {}
            if not bool(s_state.get('present')) or not g_lines:
                group_hour_deltas[(g.id, r.id)] = None
                continue

            has_c = False
            r_c = 0.0
            for l in g_lines:
                if l.compteur_horaire is not None:
                    r_c = max(r_c, float(l.compteur_horaire))
                    has_c = True

            if not has_c:
                h_delta = None
            elif prev_c is None:
                h_delta = 0.0
                prev_c = r_c
            else:
                h_delta = max(0.0, r_c - prev_c)
                prev_c = r_c

            group_hour_deltas[(g.id, r.id)] = h_delta

    # Construction des blocs groupes
    group_blocks = []
    for groupe in groupes:
        primary_site_id = group_primary_site_ids.get(groupe.id)
        if selected_site_id is not None and primary_site_id != selected_site_id:
            continue

        hours_run = []
        volume = []
        weighted_volumes = []
        consumed_deltas = []
        previous_counter = None

        # Proportion stable (tous les groupes liés à la CP)
        linked_groups = list(groups_linked_by_site.get(primary_site_id, [])) if primary_site_id else [groupe]
        if groupe not in linked_groups:
            linked_groups = list(linked_groups) + [groupe]
        total_linked_power = sum(extraire_puissance(g.puissance) for g in linked_groups)
        group_power = extraire_puissance(groupe.puissance)
        if total_linked_power > 0:
            power_share = group_power / total_linked_power
        elif linked_groups:
            power_share = 1.0 / len(linked_groups)
        else:
            power_share = 1.0

        for report in reports:
            lines = lines_by_group_report.get((groupe.id, report.id), [])
            if primary_site_id is not None:
                lines = [l for l in lines if _line_belongs_to_site(l, primary_site_id)]
            site_state = (
                site_report_state.get((primary_site_id, report.id), {})
                if primary_site_id is not None
                else {}
            )
            site_present = bool(site_state.get('present')) and bool(lines)

            if not site_present:
                hours_run.append(None)
                volume.append(None)
                weighted_volumes.append(None)
                consumed_deltas.append(None)
                continue

            has_counter = False
            report_counter = 0.0
            for line in lines:
                if line.compteur_horaire is not None:
                    report_counter = max(report_counter, float(line.compteur_horaire))
                    has_counter = True

            if not has_counter:
                hour_delta = None
            elif previous_counter is None:
                hour_delta = 0.0
                previous_counter = report_counter
            else:
                hour_delta = max(0.0, report_counter - previous_counter)
                previous_counter = report_counter

            hours_run.append(round(hour_delta, 1) if hour_delta is not None else None)

            site_current_volume = float(site_state.get('current_volume') or 0.0)
            site_delta = float(site_state.get('delta') or 0.0)

            active_group_ids = (
                groups_by_site_report.get((primary_site_id, report.id), set())
                if primary_site_id is not None
                else set()
            )
            running_group_ids = [
                gid for gid in active_group_ids
                if group_hour_deltas.get((gid, report.id)) is not None
                and group_hour_deltas.get((gid, report.id)) > 0
            ]

            if running_group_ids:
                if groupe.id in running_group_ids:
                    running_groups = [groupes_by_id[gid] for gid in running_group_ids if gid in groupes_by_id]
                    total_power_running = sum(extraire_puissance(g.puissance) for g in running_groups)
                    if total_power_running > 0:
                        period_share = extraire_puissance(groupe.puissance) / total_power_running
                    elif running_groups:
                        period_share = 1.0 / len(running_groups)
                    else:
                        period_share = 1.0
                else:
                    period_share = 0.0
            else:
                report_groups = [groupes_by_id[gid] for gid in active_group_ids if gid in groupes_by_id]
                total_power_report = sum(extraire_puissance(g.puissance) for g in report_groups)
                if total_power_report > 0:
                    period_share = extraire_puissance(groupe.puissance) / total_power_report
                elif report_groups:
                    period_share = 1.0 / len(report_groups)
                else:
                    period_share = 1.0

            weighted_report_volume = round(site_current_volume * power_share, 1)
            weighted_report_delta = round(site_delta * period_share, 1)

            volume.append(weighted_report_volume)
            weighted_volumes.append(weighted_report_volume)
            consumed_deltas.append(weighted_report_delta)

        finite_hours = [h for h in hours_run if h is not None and h > 0]
        finite_deltas = [d for d in consumed_deltas if d is not None]
        total_hours = sum(finite_hours)
        total_consumed = sum(d for d in finite_deltas if d > 0)
        has_infinite_cons = any(
            d is not None and d > 0 and (h is None or h == 0)
            for h, d in zip(hours_run, consumed_deltas)
        )

        if total_hours > 0:
            mean_hourly_consumption = total_consumed / total_hours
        else:
            mean_hourly_consumption = 0.0

        per_period_rates = []
        for h, d in zip(hours_run, consumed_deltas):
            if h is not None and h > 0 and d is not None:
                rate = round(d / h, 2)
                if rate > 0:
                    per_period_rates.append(rate)
        mean_hourly_consumption_deduite = (
            sum(per_period_rates) / len(per_period_rates) if per_period_rates else 0.0
        )

        latest_hourly_consumption = None
        previous_hourly_consumption = None
        for h, d in zip(reversed(hours_run), reversed(consumed_deltas)):
            if h is not None and h > 0 and d is not None and d > 0:
                rate = d / h
                if latest_hourly_consumption is None:
                    latest_hourly_consumption = rate
                elif previous_hourly_consumption is None:
                    previous_hourly_consumption = rate
                    break

        latest_main_volume = None
        latest_daily_volume = None
        for report in reversed(reports):
            last_lines = lines_by_group_report.get((groupe.id, report.id), [])
            if primary_site_id is not None:
                last_lines = [l for l in last_lines if _line_belongs_to_site(l, primary_site_id)]
            if last_lines:
                cp_vals = [
                    float(l.quantite_gasoil_cuve_principale)
                    for l in last_lines
                    if l.quantite_gasoil_cuve_principale is not None
                ]
                cj_vals = [
                    float(l.quantite_gasoil_cuve_journaliere or 0.0)
                    for l in last_lines
                ]
                latest_main_volume = round(max(cp_vals), 1) if cp_vals else None
                latest_daily_volume = round(sum(cj_vals), 1) if cj_vals else None
                break

        # ──────────────────────────────────────────────────────────
        # AUTONOMIE — CORRECTION : utilisation de mean_hourly_consumption_deduite
        # ──────────────────────────────────────────────────────────
        volume_proportionnel = None
        if latest_main_volume is not None:
            cj_part = float(latest_daily_volume or 0.0)
            volume_proportionnel = round(latest_main_volume * power_share + cj_part, 1)

        autonomy_hours = None
        formatted_autonomy = None
        is_infinite_consumption = bool(has_infinite_cons)

        latest_hours_n = hours_run[-1] if hours_run else None
        previous_hours_n = hours_run[-2] if len(hours_run) >= 2 else None
        latest_cons_n = consumed_deltas[-1] if consumed_deltas else None
        previous_cons_n = consumed_deltas[-2] if len(consumed_deltas) >= 2 else None

        is_sans_fonctionnement = should_mark_sans_fonctionnement(
            latest_hours_n,
            latest_cons_n,
            hours_run,
            consumed_deltas,
            is_infinite_consumption,
        )

        indet_reason = None
        if is_sans_fonctionnement:
            is_infinite_autonomy = False
            autonomy_hours = None
            formatted_autonomy = None
            indet_reason = (
                'Delta horaire semaine N = 0 h'
                + (
                    f' · consommation semaine N = {latest_cons_n:.1f} L'
                    if latest_cons_n is not None
                    else ''
                )
                + ' → sans fonctionnement.'
            )
        # 🔧 CORRECTION ICI : on utilise mean_hourly_consumption_deduite
        elif mean_hourly_consumption_deduite > 0 and volume_proportionnel is not None:
            is_infinite_autonomy = False
            autonomy_hours = volume_proportionnel / mean_hourly_consumption_deduite
            formatted_autonomy = formater_autonomie(autonomy_hours)
        else:
            # 🔧 CORRECTION BUG INDÉTERMINÉE :
            # Si on a une consommation mais pas de volume ou pas de ratio horaire,
            # on n'est pas forcement "indéterminée" : on peut calculer un ratio
            # à partir de la dernière semaine si elle est valide.
            is_infinite_autonomy = True
            autonomy_hours = None
            formatted_autonomy = "∞"
            reasons = []
            if volume_proportionnel is None:
                reasons.append('volume cuve indisponible')
            if mean_hourly_consumption_deduite == 0:
                # Si on a quand même une conso N>0, on est pas vraiment indéterminé
                if latest_cons_n is not None and latest_cons_n > 0 and latest_hours_n is not None and latest_hours_n > 0:
                    # Recalcul d'un ratio horaire valide à partir de la dernière période
                    ratio_n = latest_cons_n / latest_hours_n if latest_hours_n else 0
                    if ratio_n > 0 and volume_proportionnel is not None:
                        is_infinite_autonomy = False
                        autonomy_hours = volume_proportionnel / ratio_n
                        formatted_autonomy = formater_autonomie(autonomy_hours)
                        indet_reason = None
                    else:
                        reasons.append('aucune période avec consommation et delta horaire')
                        indet_reason = (
                            'Données insuffisantes : ' + (' · '.join(reasons) if reasons else '')
                        )
                else:
                    reasons.append('aucune période avec consommation et delta horaire')
                    if latest_hours_n is None and latest_cons_n is None:
                        reasons.append('pas de relevé sur la semaine N')
                    indet_reason = (
                        'Données insuffisantes : ' + (' · '.join(reasons) if reasons else '')
                    )
            if is_infinite_autonomy:
                indet_reason = (
                    'Données insuffisantes : ' + (' · '.join(reasons) if reasons else '')
                )

        group_blocks.append({
            'id': groupe.id,
            'label': groupe.identifiant,
            'site_id': primary_site_id,
            'site_nom': next((
                (getattr(getattr(site, 'site', None), 'nom', None) or site.identifiant)
                for site in sites if site.id == primary_site_id
            ), ''),
            'puissance': groupe.puissance,
            'power_share': round(power_share, 4),
            'volume_proportionnel': volume_proportionnel,
            'hours_run': hours_run,
            'volume': volume,
            'weighted_volume': weighted_volumes,
            'consumption': consumed_deltas,
            'mean_hourly_consumption': round(mean_hourly_consumption, 3),
            'mean_hourly_consumption_deduite': round(mean_hourly_consumption_deduite, 3),
            'latest_hourly_consumption': (
                round(latest_hourly_consumption, 3) if latest_hourly_consumption is not None else None
            ),
            'previous_hourly_consumption': (
                round(previous_hourly_consumption, 3) if previous_hourly_consumption is not None else None
            ),
            'latest_hours_n': round(latest_hours_n, 1) if latest_hours_n is not None else None,
            'previous_hours_n': round(previous_hours_n, 1) if previous_hours_n is not None else None,
            'latest_cons_n': round(latest_cons_n, 1) if latest_cons_n is not None else None,
            'previous_cons_n': round(previous_cons_n, 1) if previous_hours_n is not None else None,
            'autonomie_hours': round(autonomy_hours, 1) if autonomy_hours is not None else None,
            'formatted_autonomy': formatted_autonomy,
            'is_infinite_autonomy': is_infinite_autonomy,
            'is_infinite_consumption': is_infinite_consumption,
            'is_sans_fonctionnement': is_sans_fonctionnement,
            'indet_reason': indet_reason,
            'latest_main_volume': latest_main_volume,
            'latest_daily_volume': latest_daily_volume,
            'color': '#0b3d7a',
        })

    return group_blocks