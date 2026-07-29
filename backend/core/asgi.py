"""
ASGI config for CarburFlow backend.
"""
import os
from pathlib import Path
import sys

backend_dir = Path(__file__).resolve().parent.parent
project_root = backend_dir.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(project_root))

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')

application = get_asgi_application()
