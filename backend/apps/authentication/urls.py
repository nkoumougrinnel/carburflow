from django.urls import path

from .views import (
    AdminSetRoleAPIView,
    AdminStaffUsersAPIView,
    AdminUserSearchAPIView,
    CsrfAPIView,
    LoginAPIView,
    LogoutAPIView,
    MeAPIView,
    PasswordChangeAPIView,
    RegisterAPIView,
)

urlpatterns = [
    path('register', RegisterAPIView.as_view(), name='api-auth-register'),
    path('login', LoginAPIView.as_view(), name='api-auth-login'),
    path('logout', LogoutAPIView.as_view(), name='api-auth-logout'),
    path('me', MeAPIView.as_view(), name='api-auth-me'),
    path('password', PasswordChangeAPIView.as_view(), name='api-auth-password'),
    path('csrf', CsrfAPIView.as_view(), name='api-auth-csrf'),
    # 'sites' endpoint removed — authentication no longer exposes public sites
    path('users/staff', AdminStaffUsersAPIView.as_view(), name='api-auth-users-staff'),
    path('users/search', AdminUserSearchAPIView.as_view(), name='api-auth-users-search'),
    path('users/set-role', AdminSetRoleAPIView.as_view(), name='api-auth-users-set-role'),
]
