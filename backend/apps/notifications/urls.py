from django.urls import path

from .views import (
    NotificationListAPIView,
    NotificationMarkAllReadAPIView,
    NotificationMarkReadAPIView,
    NotificationSendAPIView,
    NotificationUnreadCountAPIView,
)

urlpatterns = [
    path('notifications/', NotificationListAPIView.as_view(), name='notifications-list'),
    path(
        'notifications/unread-count',
        NotificationUnreadCountAPIView.as_view(),
        name='notifications-unread-count',
    ),
    path(
        'notifications/read-all',
        NotificationMarkAllReadAPIView.as_view(),
        name='notifications-read-all',
    ),
    path(
        'notifications/send',
        NotificationSendAPIView.as_view(),
        name='notifications-send',
    ),
    path(
        'notifications/<int:pk>/read',
        NotificationMarkReadAPIView.as_view(),
        name='notifications-mark-read',
    ),
]
