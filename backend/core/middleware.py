"""Middlewares applicatifs CarburFlow."""


class CorsMiddleware:
    """
    CORS léger (sans dépendance externe).
    En dev : autorise toutes les origines.
    En prod : utilise CORS_ALLOWED_ORIGINS.
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

        if allow_all:
            response['Access-Control-Allow-Origin'] = origin or '*'
            if origin:
                response['Access-Control-Allow-Credentials'] = 'true'
                response['Vary'] = 'Origin'
        elif origin and origin in allowed:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Vary'] = 'Origin'

        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = (
            'Authorization, Content-Type, X-CSRFToken, X-Requested-With, Accept'
        )
        response['Access-Control-Max-Age'] = '86400'
        return response
