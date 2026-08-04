import statistics

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.services import calculs as calc
from apps.api.services.analytics import _period_stats
from apps.equipment.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene
from apps.reports.models import LigneRapport, Rapport


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
        numeric = [float(v) for v in values if v is not None]
        return float(statistics.fmean(numeric)) if numeric else 0.0

    def _last_numeric(self, values, default=0.0):
        for value in reversed(values or []):
            if value is not None:
                return round(float(value), 1)
        return round(float(default), 1)

    def get(self, request):
        reports = list(Rapport.objects.order_by('date_debut', 'date_fin', 'id'))
        labels = [self._report_label(r) for r in reports]
        lines = list(
            LigneRapport.objects.filter(rapport__in=reports)
            .select_related('cuve_journaliere')
            .only(
                'rapport_id', 'groupe_electrogene_id', 'cuve_principale_id',
                'cuve_journaliere_id', 'quantite_gasoil_cuve_principale',
                'quantite_gasoil_cuve_journaliere', 'depotage', 'compteur_horaire',
            )
        )

        return Response({
            'labels': labels,
            'stats': _period_stats(reports, lines),
        })
