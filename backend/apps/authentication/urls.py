from django.urls import path

from .views import (
    CsrfAPIView,
    LoginAPIView,
    LogoutAPIView,
    MeAPIView,
    PasswordChangeAPIView,
    PublicSitesAPIView,
    RegisterAPIView,
)

urlpatterns = [
    path('register', RegisterAPIView.as_view(), name='api-auth-register'),
    path('login', LoginAPIView.as_view(), name='api-auth-login'),
    path('logout', LogoutAPIView.as_view(), name='api-auth-logout'),
    path('me', MeAPIView.as_view(), name='api-auth-me'),
    path('password', PasswordChangeAPIView.as_view(), name='api-auth-password'),
    path('csrf', CsrfAPIView.as_view(), name='api-auth-csrf'),
    path('sites', PublicSitesAPIView.as_view(), name='api-auth-sites'),
]
