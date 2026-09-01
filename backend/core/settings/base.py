# backend/core/settings/base.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/
PROJECT_ROOT = BASE_DIR.parent  # carburflow/

SECRET_KEY = os.getenv(
    'SECRET_KEY',
    'django-insecure-w3!)*9!+%b)vvu(73b*t6p8e=&#3w&_wf@)j53y_@i#wfy!-=_',
)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Apps tierces
    'rest_framework',
    'rest_framework.authtoken',
    'drf_spectacular',
    # Apps métier
    'apps.authentication.apps.AuthenticationConfig',
    'apps.sites.apps.SitesConfig',
    'apps.reports.apps.ReportsConfig',
    'apps.alerts.apps.AlertsConfig',
    'apps.notifications.apps.NotificationsConfig',
    'apps.services.apps.ServicesConfig',
    'apps.equipment.apps.EquipmentConfig',
]

MIDDLEWARE = [
    'core.middleware.CorsMiddleware',
    'core.middleware.TrustNgrokOriginMiddleware',
    'django.middleware.security.SecurityMiddleware',
]
try:
    import whitenoise  # noqa: F401
    MIDDLEWARE.append('whitenoise.middleware.WhiteNoiseMiddleware')
except ImportError:
    pass
MIDDLEWARE.extend([
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
])

ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 6},
    },
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Douala'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
# Répertoire où collectstatic place les fichiers statiques en production
STATIC_ROOT = PROJECT_ROOT / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = PROJECT_ROOT / 'data' / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'CarburFlow API v1',
    'DESCRIPTION': 'API REST v1 CarburFlow — sites, cuves, groupes, rapports',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# CORS (utilisé par core.middleware.CorsMiddleware)
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    o for o in os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',') if o
]

# Derrière ngrok / tunnels HTTPS (voir TrustNgrokOriginMiddleware)
TRUST_NGROK_ORIGINS = os.getenv('TRUST_NGROK_ORIGINS', 'false').lower() in {'1', 'true', 'yes', 'on'}
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()
]
