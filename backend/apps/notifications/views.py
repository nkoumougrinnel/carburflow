from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.permissions import IsAdminRole

from .models import Notification
from .serializers import NotificationSerializer, SendMessageSerializer
from .services import send_message


class NotificationListAPIView(APIView):
    """Boîte de réception de l’utilisateur connecté."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Notifications'],
        summary='Lister mes notifications',
        parameters=[
            OpenApiParameter(name='lu', description='true | false', required=False, type=str),
            OpenApiParameter(name='limit', required=False, type=int),
        ],
    )
    def get(self, request):
        qs = (
            Notification.objects.filter(destinataire=request.user)
            .select_related('expediteur', 'alerte')
            .order_by('-date_envoi')
        )
        lu_param = (request.query_params.get('lu') or '').strip().lower()
        if lu_param in {'0', 'false', 'non', 'unread'}:
            qs = qs.filter(lu=False)
        elif lu_param in {'1', 'true', 'oui', 'read'}:
            qs = qs.filter(lu=True)

        try:
            limit = min(max(int(request.query_params.get('limit') or 100), 1), 200)
        except (TypeError, ValueError):
            limit = 100

        rows = list(qs[:limit])
        return Response(NotificationSerializer(rows, many=True).data)


class NotificationUnreadCountAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Notifications'], summary='Nombre de messages non lus')
    def get(self, request):
        count = Notification.objects.filter(destinataire=request.user, lu=False).count()
        return Response({'unread': count})


class NotificationMarkReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Notifications'], summary='Marquer une notification comme lue')
    def post(self, request, pk):
        notif = (
            Notification.objects.filter(pk=pk, destinataire=request.user)
            .select_related('expediteur', 'alerte')
            .first()
        )
        if not notif:
            return Response({'detail': 'Notification introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        notif.marquer_lue()
        return Response(NotificationSerializer(notif).data)


class NotificationMarkAllReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Notifications'], summary='Tout marquer comme lu')
    def post(self, request):
        updated = Notification.objects.filter(
            destinataire=request.user,
            lu=False,
        ).update(lu=True, date_lecture=timezone.now())
        return Response({'detail': 'Messages marqués comme lus.', 'updated': updated})


class NotificationSendAPIView(APIView):
    """Messagerie : un admin envoie un message à un utilisateur."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    @extend_schema(
        request=SendMessageSerializer,
        tags=['Notifications'],
        summary='Envoyer un message',
    )
    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            notif = send_message(
                expediteur=request.user,
                destinataire=data['destinataire'],
                contenu=data['contenu'],
                sujet=data['sujet'],
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                'detail': 'Message envoyé.',
                'notification': NotificationSerializer(notif).data,
            },
            status=status.HTTP_201_CREATED,
        )
