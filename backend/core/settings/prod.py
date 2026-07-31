# backend/core/settings/prod.py — PostgreSQL (production)
from .base import *  # noqa: F401,F403
import os

DEBUG = False
ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', '').split(',') if h.strip()]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'carburflow'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()
]

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'true').lower() == 'true'
# En Docker HTTP local, laisser SECURE_SSL_REDIRECT=false (compose) suffit ;
# les cookies sécurisés suivent le même flag pour éviter les sessions cassées.
_secure = SECURE_SSL_REDIRECT
SESSION_COOKIE_SECURE = _secure
CSRF_COOKIE_SECURE = _secure

# Derrière ngrok / reverse-proxy : faire confiance aux en-têtes X-Forwarded-*
USE_X_FORWARDED_HOST = os.getenv('USE_X_FORWARDED_HOST', 'true').lower() in {
    '1', 'true', 'yes', 'on',
}
_proxy_ssl = os.getenv('SECURE_PROXY_SSL_HEADER', 'true').lower() in {
    '1', 'true', 'yes', 'on',
}
if _proxy_ssl:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Docker local + ngrok : TRUST_NGROK_ORIGINS=true (compose)
TRUST_NGROK_ORIGINS = os.getenv('TRUST_NGROK_ORIGINS', 'false').lower() in {
    '1', 'true', 'yes', 'on',
}
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()
]
