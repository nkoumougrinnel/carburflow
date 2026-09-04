FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=core.settings.prod \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120 \
    SECURE_SSL_REDIRECT=false

WORKDIR /app

# Dépendances système minimales
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --timeout 120 --retries 10 -r /tmp/requirements.txt

COPY backend /app/backend
COPY data/imports /app/data/imports
COPY docker/backend/entrypoint.sh /app/backend/entrypoint.sh

RUN sed -i 's/\r$//' /app/backend/entrypoint.sh \
    && chmod +x /app/backend/entrypoint.sh \
    && mkdir -p /app/staticfiles /app/data/media /app/data/exports /app/data/logs

WORKDIR /app/backend

# Collecte des statics (pas besoin de DB).
# SECRET_KEY n'existe qu'au runtime (compose) ; collectstatic importe les
# settings prod -> on fournit une clé jetable réservée à cette étape de build
# (valable uniquement pour ce RUN, jamais persistée dans l'image).
RUN SECRET_KEY=build-time-collectstatic \
    python manage.py collectstatic --noinput

EXPOSE 8001

ENTRYPOINT ["/app/backend/entrypoint.sh"]
CMD ["python", "-m", "gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8001", "--workers", "3", "--timeout", "120"]
