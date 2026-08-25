FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=core.settings.prod \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    # collectstatic / build local sans HTTPS forcé
    SECURE_SSL_REDIRECT=false

WORKDIR /app/backend

# Dépendances système minimales
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --timeout 120 --retries 10 -r /tmp/requirements.txt

COPY backend /app/backend
# CSV init (PROJECT_ROOT=/app → data/imports)
COPY data/imports /app/data/imports
COPY docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && mkdir -p /app/staticfiles /app/data/media /app/data/exports /app/data/logs

# Collecte des statics (pas besoin de DB)
RUN python manage.py collectstatic --noinput

EXPOSE 8001
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "-m", "gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8001", "--workers", "3", "--timeout", "120"]
