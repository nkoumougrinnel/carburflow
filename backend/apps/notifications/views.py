from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer, SendMessageSerializer
from apps.services.notifications import (
    admin_recipients,
    is_admin_recipient,
    send_message,
    user_is_messaging_admin,
)


class NotificationListAPIView(APIView):
    """Boîte de réception ou d’envoi de l’utilisateur connecté."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Notifications'],
        summary='Lister mes messages',
        parameters=[
            OpenApiParameter(
                name='box',
                description='inbox (défaut) | sent',
                required=False,
                type=str,
            ),
            OpenApiParameter(name='lu', description='true | false', required=False, type=str),
            OpenApiParameter(name='limit', required=False, type=int),
        ],
    )
    def get(self, request):
        box = (request.query_params.get('box') or 'inbox').strip().lower()
        if box in {'sent', 'outbox', 'envoyes', 'envoyés'}:
            qs = (
                Notification.objects.filter(expediteur=request.user)
                .select_related('expediteur', 'destinataire')
                .order_by('-date_envoi')
            )
        else:
            # Messagerie = messages humains uniquement (exclut les notifications système sans expéditeur)
            qs = (
                Notification.objects.filter(destinataire=request.user, expediteur__isnull=False)
                .select_related('expediteur', 'destinataire')
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
        count = Notification.objects.filter(
            destinataire=request.user,
            lu=False,
        ).count()
        return Response({'unread': count})


class NotificationMarkReadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Notifications'], summary='Marquer une notification comme lue')
    def post(self, request, pk):
        notif = (
            Notification.objects.filter(pk=pk, destinataire=request.user)
            .select_related('expediteur')
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


class MessagingAdminsAPIView(APIView):
    """Liste des responsables joignables par messagerie (tous rôles authentifiés)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=['Notifications'], summary='Lister les responsables')
    def get(self, request):
        rows = []
        for user in admin_recipients().order_by('email', 'username')[:100]:
            if user.pk == request.user.pk:
                continue
            name = user.get_full_name().strip() or user.username
            rows.append({
                'id': user.id,
                'email': user.email or '',
                'username': user.username,
                'nom': name,
            })
        return Response(rows)


class NotificationSendAPIView(APIView):
    """Messagerie : admin → n’importe qui ; utilisateur/opérateur → responsables uniquement."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=SendMessageSerializer,
        tags=['Notifications'],
        summary='Envoyer un message',
    )
    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        destinataire = data['destinataire']

        if not user_is_messaging_admin(request.user):
            if not is_admin_recipient(destinataire):
                return Response(
                    {'detail': 'Vous ne pouvez écrire qu’à un responsable.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

        try:
            notif = send_message(
                expediteur=request.user,
                destinataire=destinataire,
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
