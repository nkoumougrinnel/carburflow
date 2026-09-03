from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.permissions import IsAdminRole

from .models import Alerte
from .serializers import (
    AlerteListSerializer,
    AlerteTreatmentSerializer,
    TreatAlertSerializer,
)

TYPE_ALIASES = {
    'critique': 'autonomie_critique',
    'alerte': 'autonomie_preventive',
    'anomalie': 'conso_sans_fonctionnement',
    'ecart': 'ecart_conso',
    'autonomie_critique': 'autonomie_critique',
    'autonomie_preventive': 'autonomie_preventive',
    'conso_sans_fonctionnement': 'conso_sans_fonctionnement',
    'fonctionnement_sans_consommation': 'fonctionnement_sans_consommation',
    # anciens codes (compat lectures avant migration de données)
    'conso_sans_horaire': 'conso_sans_fonctionnement',
    'horaire_sans_conso': 'fonctionnement_sans_consommation',
    'ecart_conso': 'ecart_conso',
    'compteur_incoherent': 'compteur_incoherent',
}

PRIORITE_ALIASES = {
    'critical': 'critique',
    'urgent': 'critique',
    'high': 'haute',
    'medium': 'moyenne',
    'warning': 'moyenne',
    'low': 'basse',
    'critique': 'critique',
    'haute': 'haute',
    'moyenne': 'moyenne',
    'basse': 'basse',
}


class AlerteListAPIView(APIView):
    """Liste des alertes persistées (source de vérité du dashboard)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Alertes'],
        summary='Lister les alertes',
        parameters=[
            OpenApiParameter(
                name='etat',
                description='nouvelle|en_cours|traitee|ignoree|actives|all',
                required=False,
                type=str,
            ),
            OpenApiParameter(name='priorite', required=False, type=str),
            OpenApiParameter(name='type', required=False, type=str),
            OpenApiParameter(name='site_id', required=False, type=int),
            OpenApiParameter(name='group_id', required=False, type=int),
        ],
    )
    def get(self, request):
        qs = Alerte.objects.select_related(
            'site',
            'groupe_electrogene',
            'traite_par',
        ).order_by('-date_apparition', '-id')

        etat = (request.query_params.get('etat') or 'actives').strip().lower()
        if etat == 'actives':
            qs = qs.filter(etat__in=Alerte.ETATS_ACTIFS)
        elif etat != 'all':
            qs = qs.filter(etat=etat)

        priorite = (request.query_params.get('priorite') or '').strip().lower()
        if priorite:
            qs = qs.filter(priorite=PRIORITE_ALIASES.get(priorite, priorite))

        type_alerte = (request.query_params.get('type') or '').strip().lower()
        if type_alerte:
            qs = qs.filter(type_alerte=TYPE_ALIASES.get(type_alerte, type_alerte))

        site_id = request.query_params.get('site_id')
        if site_id not in (None, ''):
            # Le front envoie souvent l’id CuvePrincipale
            qs = qs.filter(donnees_contexte__cuve_principale_id=int(site_id))

        group_id = request.query_params.get('group_id')
        if group_id not in (None, ''):
            qs = qs.filter(groupe_electrogene_id=int(group_id))

        return Response(AlerteListSerializer(qs, many=True).data)


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
    """Marquer une alerte comme traitée (admin) avec justification."""

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

        type_raw = (data.get('type') or '').strip()
        type_alerte = TYPE_ALIASES.get(type_raw, type_raw or 'ecart_conso')
        if type_alerte not in dict(Alerte.TYPE_CHOICES):
            type_alerte = 'ecart_conso'

        priorite = PRIORITE_ALIASES.get(
            (data.get('severity') or '').strip().lower(),
            'moyenne',
        )

        alerte = Alerte.objects.filter(cle=cle).first()
        if alerte is None:
            # Fallback : traitement d’une alerte non encore persistée
            alerte = Alerte(
                cle=cle,
                message=message or cle,
                type_alerte=type_alerte,
                priorite=priorite,
                donnees_contexte={
                    'cuve_principale_id': data.get('site_id'),
                    'groupe_id': data.get('group_id'),
                },
            )
            if data.get('group_id') is not None:
                alerte.groupe_electrogene_id = data.get('group_id')
            alerte.save()
        else:
            if message:
                alerte.message = message
            alerte.type_alerte = type_alerte
            alerte.priorite = priorite
            if data.get('group_id') is not None:
                alerte.groupe_electrogene_id = data.get('group_id')
            ctx = dict(alerte.donnees_contexte or {})
            if data.get('site_id') is not None:
                ctx['cuve_principale_id'] = data.get('site_id')
            if data.get('group_id') is not None:
                ctx['groupe_id'] = data.get('group_id')
            alerte.donnees_contexte = ctx
            alerte.save()

        try:
            alerte.marquer_traitee(request.user, justification)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                'detail': 'Alerte marquée comme traitée.',
                'alerte': AlerteTreatmentSerializer(alerte).data,
            },
            status=status.HTTP_200_OK,
        )
