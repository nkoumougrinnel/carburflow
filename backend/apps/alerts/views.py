from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.permissions import IsAdminRole

from .models import Alerte
from .serializers import AlerteTreatmentSerializer, TreatAlertSerializer

TYPE_MAP = {
    'critique': 'seuil_bas',
    'alerte': 'seuil_bas',
    'anomalie': 'compteur_anormal',
    'ecart': 'ecart_releve',
}

PRIORITE_MAP = {
    'critical': 'critique',
    'medium': 'moyenne',
    'low': 'basse',
    'urgent': 'critique',
}


class AlertTreatmentsAPIView(APIView):
    """Liste des alertes marquées comme traitées (clé synthétique)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Alertes'], summary='Traitements d’alertes')
    def get(self, request):
        qs = (
            Alerte.objects.filter(etat='traitee')
            .exclude(cle__isnull=True)
            .exclude(cle='')
            .select_related('traite_par')
            .order_by('-date_traitement')
        )
        return Response(AlerteTreatmentSerializer(qs, many=True).data)


class AlertTreatAPIView(APIView):
    """Marquer une alerte calculée comme traitée (admin) avec justification."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(tags=['Alertes'], summary='Marquer une alerte comme traitée')
    def post(self, request):
        serializer = TreatAlertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cle = data['cle'].strip()
        justification = data['justification'].strip()
        if len(justification) < 5:
            return Response(
                {'detail': 'La justification doit contenir au moins 5 caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        title = (data.get('title') or '').strip()
        subtitle = (data.get('subtitle') or '').strip()
        message = title
        if subtitle:
            message = f'{title}\n{subtitle}'.strip() if title else subtitle

        type_alerte = TYPE_MAP.get((data.get('type') or '').strip(), 'autre')
        priorite = PRIORITE_MAP.get((data.get('severity') or '').strip().lower(), 'moyenne')

        alerte, _created = Alerte.objects.get_or_create(
            cle=cle,
            defaults={
                'message': message or cle,
                'type_alerte': type_alerte,
                'priorite': priorite,
                'site_id': data.get('site_id'),
                'groupe_electrogene_id': data.get('group_id'),
            },
        )

        if not _created:
            alerte.message = message or alerte.message
            alerte.type_alerte = type_alerte
            alerte.priorite = priorite
            if data.get('site_id') is not None:
                alerte.site_id = data.get('site_id')
            if data.get('group_id') is not None:
                alerte.groupe_electrogene_id = data.get('group_id')

        alerte.etat = 'traitee'
        alerte.justification = justification
        alerte.traite_par = request.user
        alerte.date_traitement = timezone.now()
        alerte.save()

        return Response(
            {
                'detail': 'Alerte marquée comme traitée.',
                'alerte': AlerteTreatmentSerializer(alerte).data,
            },
            status=status.HTTP_200_OK,
        )
