from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.services import calculs as calc
from apps.equipment.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene
from apps.reports.models import LigneRapport


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
