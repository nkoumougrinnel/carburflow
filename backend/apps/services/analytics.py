"""
Service d'analyse et de synthèse pour le tableau de bord CarburFlow.
Il transforme les calculs bruts de `services.calculs` en structures de données
optimisées pour le frontend.
"""

from __future__ import annotations
from typing import Any
from django.db.models import Q

from apps.services import calculs as calc
from apps.services.alerts import serialize_dashboard_alerts
from apps.equipment.models import CuvePrincipale, GroupeElectrogene
from apps.reports.models import LigneRapport
from apps.alerts.models import Alerte


class AnalyticsService:
    """
    Service centralisant la logique d'agrégation pour les trois niveaux d'analyse :
    Système (Global) -> Site -> Équipement.
    """

    @staticmethod
    def _prepare_base_data():
        """
        Prépare les données de base nécessaires à presque toutes les analyses.
        C'est le cœur de l'orchestration pour éviter les répétitions.
        """
        reports = calc.ordered_rapports()
        sites = list(CuvePrincipale.objects.select_related('site').order_by('id'))
        groups = list(GroupeElectrogene.objects.select_related('cuve_journaliere').order_by('id'))

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
            if line.cuve_journaliere_id and line.cuve_journaliere and line.cuve_journaliere.cuve_principale_id:
                site_ids.add(line.cuve_journaliere.cuve_principale_id)
            for sid in site_ids:
                lines_by_site_report.setdefault((sid, line.rapport_id), []).append(line)

        lines_by_group_report = {}
        for line in lignes_all:
            if line.groupe_electrogene_id:
                lines_by_group_report.setdefault((line.groupe_electrogene_id, line.rapport_id), []).append(line)

        group_primary_site_ids = calc.build_group_primary_site_ids(groups, lignes_all)

        groups_by_site_report = {}
        for line in lignes_all:
            if line.groupe_electrogene_id:
                site_ids = set()
                if line.cuve_principale_id:
                    site_ids.add(line.cuve_principale_id)
                if line.cuve_journaliere_id and line.cuve_journaliere and line.cuve_journaliere.cuve_principale_id:
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
        )

        return {
            'reports': reports,
            'sites': sites,
            'groups': groups,
            'group_blocks': group_blocks,
            'lines_by_site_report': lines_by_site_report,
            'groupes_by_id': groupes_by_id,
        }

    @staticmethod
    def get_system_overview() -> dict[str, Any]:
        """
        Génère la synthèse globale du système (vue d'ensemble).
        """
        data = AnalyticsService._prepare_base_data()
        reports = data['reports']
        sites = data['sites']
        group_blocks = data['group_blocks']

        # 1. Analyse des Groupes
        group_rows = []
        for block in group_blocks:
            consumption_series = block['consumption'] or []
            hours_series = block['hours_run'] or []

            avg_consumption = round(calc.moyenne_positive(consumption_series), 1)
            latest_consumption = calc.last_numeric(consumption_series)
            previous_consumption = calc.previous_numeric(consumption_series, default=0.0)
            avg_hours = round(calc.moyenne_positive(hours_series), 1)
            latest_hours = calc.last_numeric(hours_series)
            previous_hours = calc.previous_numeric(hours_series, default=0.0)

            latest_hourly = block.get('latest_hourly_consumption')
            previous_hourly = block.get('previous_hourly_consumption')
            variance_pct = 0.0
            if previous_hourly and previous_hourly > 0 and latest_hourly is not None:
                variance_pct = abs((latest_hourly - previous_hourly) / previous_hourly) * 100

            weekly_hourly_variation_pct = variance_pct
            weekly_consumption_change_pct = 0.0
            if previous_consumption > 0 and latest_consumption > 0:
                weekly_consumption_change_pct = abs((latest_consumption - previous_consumption) / previous_consumption) * 100

            is_abnormal = weekly_hourly_variation_pct > 15.0
            cons_sans_delta_n = latest_consumption > 0 and not (latest_hours > 0)
            cons_sans_delta = cons_sans_delta_n or bool(block.get('is_infinite_consumption'))
            has_anomaly = bool(is_abnormal or cons_sans_delta)

            group_rows.append({
                'id': block['id'],
                'label': block['label'],
                'site_id': block['site_id'],
                'site_name': block['site_nom'],
                'avg_consumption': avg_consumption,
                'latest_consumption': latest_consumption,
                'previous_consumption': previous_consumption,
                'weekly_consumption_change_pct': round(weekly_consumption_change_pct, 1),
                'avg_hours': avg_hours,
                'latest_hours': latest_hours,
                'previous_hours': previous_hours,
                'weekly_hourly_variation_pct': round(weekly_hourly_variation_pct, 1),
                'variance_pct': round(weekly_hourly_variation_pct, 1),
                'ecart_pct': round(weekly_hourly_variation_pct, 1),
                'autonomy': block['autonomie_hours'],
                'autonomie_hours': block['autonomie_hours'],
                'formatted_autonomy': block['formatted_autonomy'],
                'is_infinite_consumption': bool(block.get('is_infinite_consumption') or cons_sans_delta),
                'is_infinite_autonomy': block['is_infinite_autonomy'],
                'latest_main_volume': block['latest_main_volume'],
                'mean_hourly_consumption': block['mean_hourly_consumption'],
                'mean_hourly_consumption_deduite': block['mean_hourly_consumption_deduite'],
                'latest_hourly_consumption': block['latest_hourly_consumption'],
                'previous_hourly_consumption': block['previous_hourly_consumption'],
                'is_abnormal': is_abnormal,
                'has_anomaly': has_anomaly,
            })

        # 2. Analyse des Sites
        site_rows = []
        lines_by_site_report = data['lines_by_site_report']
        for site in sites:
            volume_series, consumption_series = calc.calculer_site_series(
                reports, lines_by_site_report, site.id
            )

            avg_consumption = round(calc.moyenne_positive(consumption_series), 1)
            latest_consumption = calc.last_numeric(consumption_series)
            latest_volume = calc.last_numeric(volume_series)
            previous_consumption = calc.previous_numeric(consumption_series, default=0.0)
            previous_volume = calc.previous_numeric(volume_series, default=0.0)

            consumption_change_pct = 0.0
            if previous_consumption > 0 and latest_consumption > 0:
                consumption_change_pct = abs((latest_consumption - previous_consumption) / previous_consumption) * 100

            # Resolve site name
            site_obj = getattr(site, 'site', None)
            site_name = site_obj.nom if site_obj else site.identifiant

            site_rows.append({
                'id': site.id,
                'site_name': site_name,
                'label': site_name,
                'cp_identifiant': site.identifiant,
                'capacity': site.capacite,
                'avg_consumption': avg_consumption,
                'latest_consumption': latest_consumption,
                'previous_consumption': previous_consumption,
                'consumption_change_pct': round(consumption_change_pct, 1),
                'previous_volume': previous_volume,
                'latest_volume': latest_volume,
                'autonomy': None,
                'autonomie_hours': None,
                'formatted_autonomy': None,
                'is_infinite_consumption': False,
                'is_infinite_autonomy': False,
            })

        site_rows.sort(key=lambda item: item['avg_consumption'], reverse=True)

        site_rows_by_id = {s['id']: s for s in site_rows}
        for block in group_blocks:
            sid = block['site_id']
            if sid is None: continue
            site = site_rows_by_id.get(sid)
            if site:
                # On récupère tous les groupes du site pour résoudre l'autonomie
                site_groups = [gb for gb in group_blocks if gb['site_id'] == sid]
                resolved = calc.resolve_site_autonomy_from_groups(site_groups)
                site['autonomie_hours'] = resolved['autonomie_hours']
                site['formatted_autonomy'] = resolved['formatted_autonomy']
                site['is_infinite_consumption'] = bool(resolved['is_infinite_consumption'])
                site['is_infinite_autonomy'] = bool(resolved['is_infinite_autonomy'])

        # 3. Synthèse Finale
        prev_consumption = 0.0
        prev_runtime = 0.0
        has_prev_cons = False
        has_prev_hrs = False
        for block in group_blocks:
            p_cons = calc.previous_numeric(block['consumption'], default=None)
            p_hrs = calc.previous_numeric(block['hours_run'], default=None)
            if p_cons is not None:
                prev_consumption += p_cons
                has_prev_cons = True
            if p_hrs is not None:
                prev_runtime += p_hrs
                has_prev_hrs = True

        prev_consumption = round(prev_consumption, 1) if has_prev_cons else None
        prev_runtime = round(prev_runtime, 1) if has_prev_hrs else None

        def _site_is_critical(site):
            if site['is_infinite_consumption']: return True
            if site['autonomie_hours'] is not None:
                return site['autonomie_hours'] <= 24.0
            return site['autonomy'] is not None and site['autonomy'] <= 2.0

        active_alerts = list(
            Alerte.objects.filter(etat__in=Alerte.ETATS_ACTIFS)
            .select_related('site', 'groupe_electrogene', 'traite_par')
            .order_by('-date_apparition', '-id')
        )

        return {
            'reports': [{'id': r.id, 'label': calc.format_rapport_label(r)} for r in reports],
            'summary': {
                'critical_autonomy_sites': sum(1 for s in site_rows if _site_is_critical(s)),
                'abnormal_consumption_groups': sum(
                    1 for g in group_rows if g.get('has_anomaly') or g.get('is_abnormal') or g.get('is_infinite_consumption')
                ),
                'total_consumption': round(sum(s['latest_consumption'] for s in site_rows), 1),
                'previous_total_consumption': prev_consumption,
                'total_runtime': round(sum(g['latest_hours'] for g in group_rows), 1),
                'previous_total_runtime': prev_runtime,
            },
            'sites': site_rows,
            'groups': group_rows,
            'alerts': serialize_dashboard_alerts(active_alerts),
        }

    @staticmethod
    def get_site_analytics(site_id: int | None = None) -> dict[str, Any]:
        """
        Génère les séries de données pour un ou plusieurs sites.
        Si site_id est fourni, retourne les données pour ce site.
        Sinon, retourne les données pour tous les sites (mode vue d'ensemble).
        """
        data = AnalyticsService._prepare_base_data()
        reports = data['reports']
        sites = data['sites']
        groups = data['groups']
        lines_by_site_report = data['lines_by_site_report']

        site_colors = ['#0b3d7a', '#3b82f6', '#60a5fa', '#1d4ed8', '#0ea5e9']
        group_colors = ['#0b3d7a', '#3b82f6', '#60a5fa', '#1d4ed8', '#0ea5e9']

        # On détermine la liste des sites à traiter
        target_sites = sites
        if site_id is not None:
            target_sites = [s for s in sites if s.id == site_id]
            if not target_sites:
                return {
                    'labels': [calc.format_rapport_label(r) for r in reports],
                    'volumeSeries': [],
                    'hoursSeries': [],
                    'consumptionSeries': [],
                    'autonomyBySite': {},
                    'groupsBySite': {},
                }

        volume_series = []
        consumption_series = []
        hours_series = []
        autonomy_by_site = {}
        groups_by_site = {}

        for idx, cp in enumerate(target_sites):
            sid = cp.id
            site_obj = getattr(cp, 'site', None)
            site_name = site_obj.nom if site_obj else cp.identifiant

            # 1. Séries Volume et Consommation
            v_series, c_series = calc.calculer_site_series(reports, lines_by_site_report, sid)

            volume_series.append({
                'id': sid,
                'nom_site': site_name,
                'label': site_name,
                'data': v_series,
                'color': site_colors[idx % len(site_colors)],
                'capacity': cp.capacite,
            })

            consumption_series.append({
                'id': sid,
                'nom_site': site_name,
                'label': site_name,
                'data': c_series,
                'color': site_colors[idx % len(site_colors)],
            })

            # 2. Séries Heures (Datasets par groupe)
            site_groups = [gb for gb in data['group_blocks'] if gb['site_id'] == sid]

            # Pour hoursSeries, on garde la structure attendue par le front :
            # Un objet par site, contenant un tableau de datasets (un par groupe)
            hours_series.append({
                'id': sid,
                'nom_site': site_name,
                'datasets': [
                    {
                        'label': gb['label'],
                        'data': gb['hours_run'],
                        'borderColor': group_colors[i % len(group_colors)],
                        'backgroundColor': f"{group_colors[i % len(group_colors)]}20",
                    }
                    for i, gb in enumerate(site_groups)
                    if any((v or 0) > 0 for v in gb['hours_run'])
                ],
            })

            # 3. Autonomie et Groupes
            resolved_site_autonomy = calc.resolve_site_autonomy_from_groups(site_groups)
            autonomy_by_site[str(sid)] = {
                'autonomie_hours': resolved_site_autonomy['autonomie_hours'],
                'formatted_autonomy': resolved_site_autonomy['formatted_autonomy'],
                'is_infinite_consumption': bool(resolved_site_autonomy['is_infinite_consumption']),
                'is_infinite_autonomy': bool(resolved_site_autonomy['is_infinite_autonomy']),
                'is_sans_fonctionnement': bool(resolved_site_autonomy['is_sans_fonctionnement']),
            }

            groups_by_site[str(sid)] = [
                {
                    'id': gb['id'],
                    'label': gb['label'],
                    'autonomie_hours': gb.get('autonomie_hours'),
                    'formatted_autonomy': gb.get('formatted_autonomy'),
                    'is_infinite_consumption': bool(gb.get('is_infinite_consumption')),
                    'is_infinite_autonomy': bool(gb.get('is_infinite_autonomy')),
                    'is_sans_fonctionnement': bool(gb.get('is_sans_fonctionnement')),
                    'indet_reason': gb.get('indet_reason'),
                }
                for gb in site_groups
            ]

        return {
            'labels': [calc.format_rapport_label(r) for r in reports],
            'volumeSeries': volume_series,
            'hoursSeries': hours_series,
            'consumptionSeries': consumption_series,
            'autonomyBySite': autonomy_by_site,
            'groupsBySite': groups_by_site,
        }

    @staticmethod
    def get_equipment_analytics(site_id_param: str | None = None) -> dict[str, Any]:
        """
        Génère les données d'analyse pour tous les équipements.
        """
        data = AnalyticsService._prepare_base_data()
        reports = data['reports']
        group_blocks = data['group_blocks']

        if site_id_param:
            try:
                site_id_param = int(site_id_param)
                group_blocks = [gb for gb in group_blocks if gb['site_id'] == site_id_param]
            except (ValueError, TypeError):
                pass

        return {
            'labels': [calc.format_rapport_label(r) for r in reports],
            'groups': group_blocks,
        }
