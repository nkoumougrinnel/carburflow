FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=core.settings.prod

WORKDIR /app/backend

COPY backend/requirements /app/requirements
RUN pip install --no-cache-dir -r /app/requirements/prod.txt

COPY . /app
COPY . .
RUN python backend/manage.py collectstatic --noinput

RUN mkdir -p /root/.gunicorn

EXPOSE 8001
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8001", "--workers", "3", "--timeout", "120"]


