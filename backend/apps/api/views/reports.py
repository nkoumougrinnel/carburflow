from rest_framework import viewsets
from apps.reports.models import Rapport, LigneRapport
from apps.reports.serializers import RapportSerializer, LigneRapportSerializer

class RapportViewSet(viewsets.ModelViewSet):
    queryset = Rapport.objects.all()
    serializer_class = RapportSerializer

    def destroy(self, request, *args, **kwargs):
        """Suppression réservée aux responsables (les lignes partent en CASCADE)."""
        from rest_framework import status
        from rest_framework.response import Response
        from dashboard.permissions import user_is_admin

        if not user_is_admin(request.user):
            return Response(
                {'detail': 'Seul un responsable peut supprimer un rapport.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class LigneRapportViewSet(viewsets.ModelViewSet):
    queryset = LigneRapport.objects.select_related(
        'rapport', 'cuve_principale', 'cuve_journaliere', 'groupe_electrogene'
    ).order_by('rapport_id', 'id')
    serializer_class = LigneRapportSerializer
