import statistics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.services import calculs as calc, alerts as alert_service
from apps.services.alerts import serialize_dashboard_alerts
from apps.services.analytics import GROUPE_COLORS
from apps.equipment.models import CuvePrincipale, GroupeElectrogene
from apps.reports.models import LigneRapport

def _site_label_from_cuve(cuve_principale):
    site = getattr(cuve_principale, 'site', None)
    if site is not None and getattr(site, 'nom', None):
        return site.nom
    return getattr(cuve_principale, 'identifiant', None) or 'Site'

class SitesDashboardAPIView(APIView):
    """API consolidée pour la page Sites : volume, durée et consommation."""
    def get(self, request):
        reports = calc.ordered_rapports()
        sites = list(CuvePrincipale.objects.order_by('id'))
        groups = list(GroupeElectrogene.objects.order_by('id'))
        report_ids = [r.id for r in reports]

        lignes_all = list(
            LigneRapport.objects.filter(rapport_id__in=report_ids)
            .select_related('cuve_journaliere')
            .only(
                'rapport_id', 'groupe_electrogene_id', 'cuve_principale_id',
                'cuve_journaliere_id', 'cuve_journaliere__cuve_principale_id',
                'quantite_gasoil_cuve_principale', 'quantite_gasoil_cuve_journaliere',
                'depotage', 'compteur_horaire',
            )
        )

        labels = [calc.format_rapport_label(report) for report in reports]
        site_colors = ['#0b3d7a', '#3b82f6', '#60a5fa', '#1d4ed8', '#0ea5e9']
        group_colors = ['#0b3d7a', '#3b82f6', '#60a5fa', '#1d4ed8', '#0ea5e9']

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

        all_group_blocks = calc.calculer_groupes(
            reports=reports,
            groupes=groups,
            sites=sites,
            lines_by_group_report=lines_by_group_report,
            site_report_state=site_report_state,
            groups_by_site_report=groups_by_site_report,
            groupes_by_id=groupes_by_id,
            group_primary_site_ids=group_primary_site_ids,
        )
        group_blocks_by_site = {str(site.id): [] for site in sites}
        for gb in all_group_blocks:
            if gb['site_id'] is not None:
                group_blocks_by_site.setdefault(str(gb['site_id']), []).append(gb)

        groups_by_site = {}
        for site in sites:
            site_groups = group_blocks_by_site.get(str(site.id), [])
            groups_by_site[str(site.id)] = [
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

        volume_series = []
        consumption_series = []
        hours_series = []
        autonomy_by_site = {}

        for idx, site in enumerate(sites):
            site_id = site.id
            site_name = _site_label_from_cuve(site)
            color = site_colors[idx % len(site_colors)]

            volume_data, consumption_data = calc.calculer_site_series(
                reports, lines_by_site_report, site_id
            )

            volume_series.append({
                'id': site_id,
                'nom_site': site_name,
                'label': site_name,
                'data': volume_data,
                'color': color,
                'capacity': site.capacite,
            })

            consumption_series.append({
                'id': site_id,
                'nom_site': site_name,
                'label': site_name,
                'data': consumption_data,
                'color': color,
            })

            site_datasets = []
            site_groups = group_blocks_by_site.get(str(site_id), [])
            for group_idx, gb in enumerate(site_groups):
                if any((v or 0) > 0 for v in gb['hours_run']):
                    site_datasets.append({
                        'label': gb['label'],
                        'data': gb['hours_run'],
                        'borderColor': group_colors[group_idx % len(group_colors)],
                        'backgroundColor': f"{group_colors[group_idx % len(group_colors)]}20",
                    })

            hours_series.append({
                'id': site_id,
                'nom_site': site_name,
                'datasets': site_datasets,
            })

            resolved_site_autonomy = calc.resolve_site_autonomy_from_groups(site_groups)
            autonomy_by_site[str(site_id)] = {
                'autonomie_hours': resolved_site_autonomy['autonomie_hours'],
                'formatted_autonomy': resolved_site_autonomy['formatted_autonomy'],
                'is_infinite_consumption': bool(resolved_site_autonomy['is_infinite_consumption']),
                'is_infinite_autonomy': bool(resolved_site_autonomy['is_infinite_autonomy']),
                'is_sans_fonctionnement': bool(resolved_site_autonomy['is_sans_fonctionnement']),
            }

        return Response({
            'labels': labels,
            'volumeSeries': volume_series,
            'hoursSeries': hours_series,
            'consumptionSeries': consumption_series,
            'autonomyBySite': autonomy_by_site,
            'groupsBySite': groups_by_site,
            'defaultSiteId': sites[0].id if sites else None,
        })

class GroupesAPIView(APIView):
    def get(self, request):
        reports = calc.ordered_rapports()
        sites = list(CuvePrincipale.objects.select_related('site').order_by('id'))
        groups = list(GroupeElectrogene.objects.order_by('id'))
        report_ids = [r.id for r in reports]

        lignes_all = list(
            LigneRapport.objects.filter(rapport_id__in=report_ids)
            .select_related('cuve_journaliere')
            .only(
                'rapport_id', 'groupe_electrogene_id', 'cuve_principale_id',
                'cuve_journaliere_id', 'cuve_journaliere__cuve_principale_id',
                'quantite_gasoil_cuve_principale', 'quantite_gasoil_cuve_journaliere',
                'depotage', 'compteur_horaire',
            )
        )

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

        lines_by_site_report = {}
        for line in lignes_all:
            site_ids = set()
            if line.cuve_principale_id:
                site_ids.add(line.cuve_principale_id)
            if line.cuve_journaliere_id and line.cuve_journaliere and line.cuve_journaliere.cuve_principale_id:
                site_ids.add(line.cuve_journaliere.cuve_principale_id)
            for sid in site_ids:
                lines_by_site_report.setdefault((sid, line.rapport_id), []).append(line)

        site_report_state = calc.build_site_report_state(reports, sites, lines_by_site_report)
        groupes_by_id = {g.id: g for g in groups}

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

        return Response({
            'labels': [calc.format_rapport_label(report) for report in reports],
            'groups': group_blocks,
            'defaultSiteId': sites[0].id if sites else None,
            'siteColors': GROUPE_COLORS,
        })

class CuvesDashboardAPIView(APIView):
    def get(self, request):
        reports = calc.ordered_rapports()
        labels = [calc.format_rapport_label(report) for report in reports]

        cuves = list(CuvePrincipale.objects.order_by('id'))
        site_series = []
        site_colors = ['#0b3d7a', '#3b82f6', '#60a5fa', '#1d4ed8', '#0ea5e9']

        for idx, cuve in enumerate(cuves):
            data = []
            for report in reports:
                lignes = [
                    line for line in LigneRapport.objects.filter(rapport=report).select_related('cuve_journaliere')
                    if line.cuve_principale_id == cuve.id
                    or (
                        line.cuve_journaliere_id
                        and line.cuve_journaliere
                        and line.cuve_journaliere.cuve_principale_id == cuve.id
                    )
                ]
                if not lignes:
                    data.append(None)
                else:
                    data.append(round(calc._site_volume_from_lines(lignes), 1))
            site_series.append({
                'id': cuve.id,
                'nom_site': cuve.identifiant,
                'label': cuve.identifiant,
                'data': data,
                'color': site_colors[idx % len(site_colors)],
            })

        return Response({
            'labels': labels,
            'sites_series': site_series,
        })

class DashboardOverviewAPIView(APIView):
    AUTONOMY_CRITICAL_THRESHOLD = 2.0
    AUTONOMY_CRITICAL_HOURS = 24.0
    ABNORMAL_CONSUMPTION_RATIO = 1.2
    ABNORMAL_VARIANCE_THRESHOLD = 15.0

    def _report_label(self, report):
        return calc.format_rapport_label(report)

    def _mean(self, values):
        numeric = [float(v) for v in values if v is not None]
        return float(statistics.fmean(numeric)) if numeric else 0.0

    def _mean_positive(self, values):
        numeric = [float(v) for v in values if v is not None and float(v) > 0]
        return float(statistics.fmean(numeric)) if numeric else 0.0

    def _last_numeric(self, values, default=0.0):
        for value in reversed(values or []):
            if value is not None:
                return round(float(value), 1)
        return round(float(default), 1)

    def _previous_numeric(self, values, default=0.0):
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

    def _numeric_values(self, values, *, positive_only=False):
        out = []
        for v in values or []:
            if v is None:
                continue
            num = float(v)
            if positive_only and num <= 0:
                continue
            out.append(num)
        return out

    def get(self, request):
        reports = calc.ordered_rapports()
        sites = list(CuvePrincipale.objects.order_by('id'))
        groups = list(GroupeElectrogene.objects.order_by('id'))
        report_ids = [r.id for r in reports]

        lignes_all = list(
            LigneRapport.objects.filter(rapport_id__in=report_ids)
            .select_related('cuve_journaliere')
            .only(
                'rapport_id', 'groupe_electrogene_id', 'cuve_principale_id',
                'cuve_journaliere_id', 'cuve_journaliere__cuve_principale_id',
                'quantite_gasoil_cuve_principale', 'quantite_gasoil_cuve_journaliere',
                'depotage', 'compteur_horaire',
            )
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

        group_rows = []
        for block in group_blocks:
            hours_series = block['hours_run']
            consumption_series = block['consumption']
            avg_consumption = round(self._mean_positive(consumption_series), 1)
            latest_consumption = self._last_numeric(consumption_series)
            previous_consumption = self._previous_numeric(consumption_series, default=0.0)
            avg_hours = round(self._mean_positive(hours_series), 1)
            latest_hours = self._last_numeric(hours_series)
            previous_hours = self._previous_numeric(hours_series, default=0.0)

            numeric_consumption = self._numeric_values(consumption_series, positive_only=True)
            latest_hourly = block.get('latest_hourly_consumption')
            previous_hourly = block.get('previous_hourly_consumption')
            variance_pct = 0.0
            if previous_hourly and previous_hourly > 0 and latest_hourly is not None:
                variance_pct = abs((latest_hourly - previous_hourly) / previous_hourly) * 100

            weekly_hourly_change_pct = variance_pct
            weekly_consumption_change_pct = 0.0
            if previous_consumption > 0 and latest_consumption > 0:
                weekly_consumption_change_pct = abs((latest_consumption - previous_consumption) / previous_consumption) * 100

            is_abnormal = weekly_hourly_change_pct > self.ABNORMAL_VARIANCE_THRESHOLD
            cons_sans_delta_n = latest_consumption > 0 and not (latest_hours > 0)
            cons_sans_delta = cons_sans_delta_n or bool(block.get('is_infinite_consumption'))
            has_anomaly = bool(is_abnormal or cons_sans_delta)

            weekly_hourly_variation_pct = weekly_hourly_change_pct
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
                'latest_hours_n': block.get('latest_hours_n'),
                'previous_hours_n': block.get('previous_hours_n'),
                'latest_cons_n': block.get('latest_cons_n'),
                'previous_cons_n': block.get('previous_cons_n'),
                'is_abnormal': is_abnormal,
                'has_anomaly': has_anomaly,
            })

        groups_by_site = {}
        for g in group_rows:
            if g['site_id'] is not None:
                groups_by_site.setdefault(g['site_id'], []).append(g)

        site_rows = []
        site_latest_volume_map = {}
        for site in sites:
            volume_series, consumption_series = calc.calculer_site_series(
                reports, lines_by_site_report, site.id
            )

            avg_consumption = round(self._mean_positive(consumption_series), 1)
            latest_consumption = self._last_numeric(consumption_series)
            latest_volume = self._last_numeric(volume_series)

            previous_consumption = self._previous_numeric(consumption_series, default=0.0)
            previous_volume = self._previous_numeric(volume_series, default=0.0)
            consumption_change_pct = 0.0
            if previous_consumption > 0 and latest_consumption > 0:
                consumption_change_pct = abs((latest_consumption - previous_consumption) / previous_consumption) * 100

            site_rows.append({
                'id': site.id,
                'site_name': _site_label_from_cuve(site),
                'label': _site_label_from_cuve(site),
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
            site_latest_volume_map[site.id] = latest_volume

        site_rows.sort(key=lambda item: item['avg_consumption'], reverse=True)

        site_rows_by_id = {s['id']: s for s in site_rows}
        for site_id, site_groups in groups_by_site.items():
            site = site_rows_by_id.get(site_id)
            if site is None:
                continue

            resolved_site_autonomy = calc.resolve_site_autonomy_from_groups(site_groups)
            site['autonomie_hours'] = resolved_site_autonomy['autonomie_hours']
            site['formatted_autonomy'] = resolved_site_autonomy['formatted_autonomy']
            site['is_infinite_consumption'] = bool(resolved_site_autonomy['is_infinite_consumption'])
            site['is_infinite_autonomy'] = bool(resolved_site_autonomy['is_infinite_autonomy'])

        active_alerts = list(
            Alerte.objects.filter(etat__in=Alerte.ETATS_ACTIFS)
            .select_related('site', 'groupe_electrogene', 'traite_par')
            .order_by('-date_apparition', '-id')
        )
        alerts = alert_service.serialize_dashboard_alerts(active_alerts)

        prev_consumption = 0.0
        prev_runtime = 0.0
        has_prev_cons = False
        has_prev_hrs = False
        for block in group_blocks:
            p_cons = self._previous_numeric(block['consumption'], default=None)
            p_hrs = self._previous_numeric(block['hours_run'], default=None)
            if p_cons is not None:
                prev_consumption += p_cons
                has_prev_cons = True
            if p_hrs is not None:
                prev_runtime += p_hrs
                has_prev_hrs = True

        prev_consumption = round(prev_consumption, 1) if has_prev_cons else None
        prev_runtime = round(prev_runtime, 1) if has_prev_hrs else None

        def _site_is_critical(site):
            if site['is_infinite_consumption']:
                return True
            if site['autonomie_hours'] is not None:
                return site['autonomie_hours'] <= self.AUTONOMY_CRITICAL_HOURS
            return site['autonomy'] is not None and site['autonomy'] <= self.AUTONOMY_CRITICAL_THRESHOLD

        return Response({
            'reports': [{'id': r.id, 'label': self._report_label(r)} for r in reports],
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
            'alerts': alerts,
        })
