from rest_framework.views import APIView
from rest_framework.response import Response

class HealthAPIView(APIView):
    """Public liveness endpoint for deployment checks and monitoring."""
    permission_classes = []

    def get(self, request):
        return Response({
            'status': 'ok',
            'service': 'carburflow-api',
            'version': 'v1',
        })
