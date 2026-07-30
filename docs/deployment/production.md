# Production

Stack Docker : `docker/docker-compose.yml` (Postgres + backend Gunicorn + frontend `serve`).

Build images :
```bash
docker compose -f docker/docker-compose.yml build
```

Variables importantes (`core.settings.prod`) :
- `SECRET_KEY`, `ALLOWED_HOSTS`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `CORS_ALLOWED_ORIGINS`
- `SECURE_SSL_REDIRECT=true` derrière HTTPS

Reverse proxy optionnel : `docker/nginx/nginx.conf`.

Ne pas utiliser `docker-compose` (v1) : préférer `docker compose`.
