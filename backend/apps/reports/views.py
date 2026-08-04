from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.api.permissions import (
    IsAdminOrReadOnlyAuthenticated,
    user_can_access_rapports,
    user_can_upload_rapports,
    user_is_admin,
    user_is_agent as user_is_operateur,
)

from apps.reports.norme import (
    NORME_COLUMNS,
    NORME_META,
    ImportValidationError,
    build_csv_bytes,
    build_rapport_csv_bytes,
    build_rapport_xlsx_bytes,
    build_xlsx_bytes,
    import_report_rows,
    rows_from_csv,
    rows_from_xlsx,
)

from .models import LigneRapport, Rapport
from .serializers import LigneRapportSerializer, RapportListSerializer, RapportSerializer


def _user_can_access_rapport(user, rapport):
    """Vérifie si un utilisateur peut consulter ou exporter un rapport."""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if not user_can_access_rapports(user):
        return False
    if user_is_admin(user):
        return True
    return getattr(rapport, 'created_by_id', None) == getattr(user, 'id', None)


class RapportViewSet(viewsets.ReadOnlyModelViewSet):
    """Lecture seule — pas de modification ni suppression de rapports."""

    queryset = Rapport.objects.select_related('created_by').prefetch_related('lignes').all()
    permission_classes = [IsAdminOrReadOnlyAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return RapportListSerializer
        return RapportSerializer

    def get_queryset(self):
        return (
            Rapport.objects.select_related('created_by')
            .prefetch_related('lignes')
            .order_by('date_debut', 'date_fin', 'id')
        )

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrReadOnlyAuthenticated()]


class LigneRapportViewSet(viewsets.ReadOnlyModelViewSet):
    """Lecture seule des lignes de rapport."""

    queryset = LigneRapport.objects.select_related(
        'rapport',
        'cuve_principale',
        'cuve_journaliere',
        'groupe_electrogene',
    )
    serializer_class = LigneRapportSerializer

    def get_permissions(self):
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrReadOnlyAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        rapport_id = self.request.query_params.get('rapport')
        if rapport_id:
            qs = qs.filter(rapport_id=rapport_id)
        return qs


class NormeMetaAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Norme'], summary='Métadonnées de la norme rapport')
    def get(self, request):
        return Response({
            **NORME_META,
            'column_names': NORME_COLUMNS,
            'download': {
                'xlsx': '/api/v1/rapports/norme.xlsx',
                'csv': '/api/v1/rapports/norme.csv',
            },
        })


class NormeCsvAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Norme'], summary='Télécharger la norme CSV')
    def get(self, request):
        content = build_csv_bytes(include_sample=True)
        response = HttpResponse(content, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="carburflow_norme_rapport.csv"'
        return response


class NormeXlsxAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Norme'], summary='Télécharger la norme Excel')
    def get(self, request):
        content = build_xlsx_bytes(include_sample=True)
        response = HttpResponse(
            content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="carburflow_norme_rapport.xlsx"'
        return response


class GenererRapportHebdoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Norme'], summary='Générer la fiche de relevé hebdomadaire pré-remplie Excel')
    def get(self, request):
        from apps.reports.pipeline import generate_rapport_template_xlsx
        date_debut = request.query_params.get('date_debut')
        date_fin = request.query_params.get('date_fin')
        try:
            content = generate_rapport_template_xlsx(date_debut, date_fin)
        except ModuleNotFoundError as exc:
            if 'openpyxl' in str(exc):
                return Response(
                    {
                        'detail': (
                            'La génération Excel nécessite le paquet openpyxl. '
                            'Installez-le : pip install openpyxl'
                        ),
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            raise
        except Exception as exc:
            return Response(
                {'detail': f'Impossible de générer la fiche : {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        filename = 'carburflow_fiche_hebdo.xlsx'
        response = HttpResponse(
            content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class RapportUploadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Rapports'], summary='Déposer un rapport (.xlsx ou .csv)')
    def post(self, request):
        if not user_can_upload_rapports(request.user):
            return Response(
                {'detail': 'Seul un opérateur peut déposer un relevé.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        upload = request.FILES.get('file') or request.FILES.get('rapport')
        if not upload:
            return Response({'detail': 'Fichier manquant (champ file).'}, status=status.HTTP_400_BAD_REQUEST)

        filename = upload.name or 'rapport'
        lower = filename.lower()
        raw = upload.read()

        try:
            if lower.endswith('.xlsx'):
                rows = rows_from_xlsx(raw)
            elif lower.endswith('.csv'):
                rows = rows_from_csv(raw)
            else:
                return Response(
                    {
                        'detail': 'Ce type de fichier n’est pas accepté.',
                        'errors': [
                            {
                                'row': None,
                                'column': None,
                                'column_label': None,
                                'message': f'Le fichier « {filename} » n’est pas un Excel ou un CSV.',
                                'how_to_fix': 'Choisissez un fichier se terminant par .xlsx ou .csv (modèle de l’étape 1).',
                            }
                        ],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            create_missing = user_is_admin(request.user)
            rapport, imported = import_report_rows(
                rows,
                request.user,
                create_missing=create_missing,
            )
            return Response(
                {
                    'detail': (
                        f'C’est bon : {imported} ligne(s) ont été enregistrée(s). '
                        'Vous pouvez les retrouver plus bas dans la liste.'
                    ),
                    'rapport': RapportSerializer(rapport).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except ImportValidationError as exc:
            return Response(exc.as_dict(), status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response(
                {
                    'detail': 'Le fichier n’a pas pu être importé.',
                    'errors': [
                        {
                            'row': None,
                            'column': None,
                            'column_label': None,
                            'message': str(exc),
                            'how_to_fix': (
                                'Vérifiez que vous utilisez le modèle téléchargé, '
                                'puis recommencez. Si le problème continue, contactez un responsable.'
                            ),
                        }
                    ],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class MesRapportsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Rapports'],
        summary='Rapports visibles selon le rôle (filtre période optionnel)',
        parameters=[
            OpenApiParameter(
                name='date_debut',
                required=False,
                type=str,
                description='Début d’intervalle (YYYY-MM-DD) — chevauchement',
            ),
            OpenApiParameter(
                name='date_fin',
                required=False,
                type=str,
                description='Fin d’intervalle (YYYY-MM-DD) — chevauchement',
            ),
        ],
    )
    def get(self, request):
        if not user_can_access_rapports(request.user):
            return Response(
                {'detail': 'Accès réservé aux responsables et opérateurs.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = (
            Rapport.objects.all()
            .select_related('created_by')
            .order_by('-date_fin', '-id')
        )
        if not user_is_admin(request.user):
            qs = qs.filter(created_by=request.user)

        date_debut = (request.query_params.get('date_debut') or '').strip()
        date_fin = (request.query_params.get('date_fin') or '').strip()
        if date_debut and date_fin:
            qs = qs.filter(
                date_debut__lte=date_fin,
                date_fin__gte=date_debut,
            )
            return Response(RapportListSerializer(qs[:100], many=True).data)

        return Response(RapportListSerializer(qs[:50], many=True).data)


class SoumissionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Rapports'], summary='Historique des soumissions de rapports')
    def get(self, request):
        if not user_can_access_rapports(request.user):
            return Response(
                {'detail': 'Accès réservé aux responsables et opérateurs.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = (
            Rapport.objects.all()
            .select_related('created_by')
            .prefetch_related('lignes')
            .order_by('-id')
        )
        if not user_is_admin(request.user):
            qs = qs.filter(created_by=request.user)

        items = []
        for rapport in qs[:100]:
            user = rapport.created_by
            username = None
            if user:
                full = f'{user.first_name} {user.last_name}'.strip()
                username = full or user.username
            rows = rapport.lignes.count()
            items.append({
                'id': rapport.id,
                'created_at': f'{rapport.date_fin}T12:00:00',
                'date_debut': rapport.date_debut,
                'date_fin': rapport.date_fin,
                'filename': f'Rapport #{rapport.id}',
                'status': 'success',
                'rows_imported': rows,
                'username': username,
                'message': f'{rows} ligne(s) importée(s).',
            })
        return Response(items)


class RapportDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Rapports'], summary='Supprimer un rapport (désactivé)')
    def delete(self, request, rapport_id):
        return Response(
            {'detail': 'La suppression de rapports n’est plus autorisée.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class RapportExportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Rapports'], summary='Exporter un rapport importé (xlsx ou csv)')
    def get(self, request, rapport_id, export_format):
        rapport = get_object_or_404(
            Rapport.objects.select_related('created_by').prefetch_related('lignes'),
            pk=rapport_id,
        )
        if not _user_can_access_rapport(request.user, rapport):
            return Response({'detail': 'Accès refusé.'}, status=status.HTTP_403_FORBIDDEN)

        fmt = (export_format or '').lower()
        if fmt == 'xlsx':
            content = build_rapport_xlsx_bytes(rapport)
            content_type = (
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        elif fmt == 'csv':
            content = build_rapport_csv_bytes(rapport)
            content_type = 'text/csv; charset=utf-8'
        else:
            return Response(
                {'detail': 'Format non supporté. Utilisez xlsx ou csv.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filename = f'carburflow_rapport_{rapport.id}.{fmt}'
        response = HttpResponse(content, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
