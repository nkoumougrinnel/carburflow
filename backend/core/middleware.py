"""Middlewares applicatifs CarburFlow."""

from __future__ import annotations

import re

_NGROK_ORIGIN_RE = re.compile(
    r'^https://[a-z0-9.-]+\.ngrok(-free)?\.(app|dev|io)(:\d+)?$',
    re.IGNORECASE,
)
_NGROK_HOST_RE = re.compile(
    r'^[a-z0-9.-]+\.ngrok(-free)?\.(app|dev|io)$',
    re.IGNORECASE,
)


def origin_is_ngrok(origin: str) -> bool:
    return bool(origin and _NGROK_ORIGIN_RE.match(origin.strip()))


def host_is_ngrok(host: str) -> bool:
    hostname = (host or '').split(':')[0].strip().lower()
    return bool(hostname and _NGROK_HOST_RE.match(hostname))


class TrustNgrokOriginMiddleware:
    """
    Derrière un tunnel ngrok HTTPS : fait confiance à l’Origin / Host pour CSRF
    et (optionnellement) pour ALLOWED_HOSTS si TRUST_NGROK_ORIGINS=true.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings

        if getattr(settings, 'TRUST_NGROK_ORIGINS', False):
            origin = request.headers.get('Origin', '') or ''
            if origin_is_ngrok(origin):
                trusted = list(getattr(settings, 'CSRF_TRUSTED_ORIGINS', []) or [])
                if origin not in trusted:
                    settings.CSRF_TRUSTED_ORIGINS = [*trusted, origin]

            host = request.get_host()
            if host_is_ngrok(host):
                allowed = list(getattr(settings, 'ALLOWED_HOSTS', []) or [])
                hostname = host.split(':')[0]
                if hostname not in allowed and '*' not in allowed:
                    # Django accepte aussi le préfixe « .ngrok-free.app », mais
                    # on ajoute l’hôte exact pour éviter les rejets DissallowedHost.
                    settings.ALLOWED_HOSTS = [*allowed, hostname]

        return self.get_response(request)


class CorsMiddleware:
    """
    CORS léger (sans dépendance externe).
    En prod : CORS_ALLOWED_ORIGINS + origines ngrok si TRUST_NGROK_ORIGINS.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == 'OPTIONS':
            from django.http import HttpResponse

            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        return self._apply_cors(request, response)

    def _apply_cors(self, request, response):
        from django.conf import settings

        origin = request.headers.get('Origin', '')
        allow_all = getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)
        allowed = getattr(settings, 'CORS_ALLOWED_ORIGINS', []) or []
        trust_ngrok = getattr(settings, 'TRUST_NGROK_ORIGINS', False)

        if allow_all:
            response['Access-Control-Allow-Origin'] = origin or '*'
            if origin:
                response['Access-Control-Allow-Credentials'] = 'true'
                response['Vary'] = 'Origin'
        elif origin and (origin in allowed or (trust_ngrok and origin_is_ngrok(origin))):
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Vary'] = 'Origin'

        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = (
            'Authorization, Content-Type, X-CSRFToken, X-Requested-With, Accept, '
            'ngrok-skip-browser-warning'
        )
        response['Access-Control-Max-Age'] = '86400'
        return response
