from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.services import calculs as calc
from apps.api.services.analytics import GROUPE_COLORS
from apps.equipment.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene
from apps.reports.models import LigneRapport


def _site_display_name(cuve_principale):
    site = getattr(cuve_principale, 'site', None)
    if site is not None and getattr(site, 'nom', None):
        return site.nom
    return cuve_principale.identifiant


class SitesDashboardAPIView(APIView):
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
        group_blocks_by_site = {}
        for site in sites:
            group_blocks_by_site[str(site.id)] = []

        for gb in all_group_blocks:
            if gb['site_id'] is not None:
                site_key = str(gb['site_id'])
                group_blocks_by_site.setdefault(site_key, []).append(gb)

        volume_series = []
        consumption_series = []
        hours_series = []
        autonomy_by_site = {}
        groups_by_site = {}

        for idx, site in enumerate(sites):
            site_id = site.id
            site_name = _site_display_name(site)
            color = site_colors[idx % len(site_colors)]

            volume_data, _ = calc.calculer_site_series(reports, lines_by_site_report, site_id)
            site_groups = group_blocks_by_site.get(str(site_id), [])
            consumption_data = calc.somme_conso_groupes(site_groups, len(reports))

            volume_series.append({
                'id': site_id,
                'nom_site': site_name,
                'label': site_name,
                'data': volume_data,
                'color': color,
            })

            consumption_series.append({
                'id': site_id,
                'nom_site': site_name,
                'label': site_name,
                'data': consumption_data,
                'color': color,
            })

            site_datasets = []
            for group_idx, gb in enumerate(site_groups):
                if any((v or 0) > 0 for v in gb['hours_run']):
                    site_datasets.append({
                        'id': gb['id'],
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

            resolved = calc.resolve_site_autonomy_from_groups(site_groups)
            autonomy_by_site[str(site_id)] = {
                'autonomie_hours': resolved['autonomie_hours'],
                'formatted_autonomy': resolved['formatted_autonomy'],
                'is_infinite_consumption': resolved['is_infinite_consumption'],
                'is_infinite_autonomy': resolved['is_infinite_autonomy'],
                'is_sans_fonctionnement': resolved['is_sans_fonctionnement'],
            }

            groups_by_site[str(site_id)] = [
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

        return Response({
            'labels': labels,
            'volumeSeries': volume_series,
            'hoursSeries': hours_series,
            'consumptionSeries': consumption_series,
            'autonomyBySite': autonomy_by_site,
            'groupsBySite': groups_by_site,
            'defaultSiteId': sites[0].id if sites else None,
        })
