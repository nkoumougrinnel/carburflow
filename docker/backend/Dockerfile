FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=core.settings.prod

WORKDIR /app

COPY backend/requirements /app/requirements
RUN pip install --no-cache-dir -r /app/requirements/prod.txt

COPY backend /app/backend
COPY backend/manage.py /app/backend/manage.py

RUN python /app/backend/manage.py collectstatic --noinput

WORKDIR /app/backend
RUN mkdir -p /root/.gunicorn

EXPOSE 8001
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8001", "--workers", "3", "--timeout", "120"]

