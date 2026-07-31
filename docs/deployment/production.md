# Production

## Stack

Compose prod : `docker/docker-compose.prod.yml` (images GHCR + Postgres).  
Nginx optionnel : `docker compose --profile with-nginx up -d`.

## Pipeline

1. Merger sur `main` → **CI** puis **CD Build** (push GHCR)
2. Tag `v*` recommandé pour une release
3. **CD Deploy** → environnement GitHub `production` (protection de branche / reviewers conseillés)

## Variables importantes (`core.settings.prod`)

- `SECRET_KEY`, `ALLOWED_HOSTS`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `CORS_ALLOWED_ORIGINS`
- `SECURE_SSL_REDIRECT=true` derrière HTTPS

## Secrets (environnement `production`)

Mêmes noms que le [staging](staging.md). Utiliser des valeurs distinctes et activer les **required reviewers** sur l’environnement GitHub `production`.

## Build local des images

```bash
docker compose -f docker/docker-compose.yml build
```

## Déploiement depuis le serveur

```bash
./scripts/deploy.sh latest
# ou
./scripts/deploy.sh v1.0.0
```

Ne pas utiliser `docker-compose` (v1) : préférer `docker compose`.
