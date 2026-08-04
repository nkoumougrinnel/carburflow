from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.services import calculs as calc
from apps.api.services.analytics import GROUPE_COLORS
from apps.equipment.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene
from apps.reports.models import LigneRapport


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
