# Staging

## Pipeline

1. **CI** (`.github/workflows/ci.yml`) — tests backend + build frontend sur PR / `dev` / `main`
2. **CD Build** (`.github/workflows/cd-build.yml`) — build & push images GHCR depuis `main` / tags `v*`
3. **CD Deploy** (`.github/workflows/cd-deploy.yml`) — déploiement manuel vers l’environnement GitHub `staging`

## Images

- `ghcr.io/<owner>/carburflow-backend:<tag>`
- `ghcr.io/<owner>/carburflow-frontend:<tag>`

Tags typiques : `latest`, `sha-<short>`, `v1.0.0`.

## Secrets / variables (environnement `staging`)

| Type | Nom | Rôle |
|------|-----|------|
| Secret | `DEPLOY_HOST` | Hôte SSH |
| Secret | `DEPLOY_USER` | Utilisateur SSH |
| Secret | `DEPLOY_SSH_KEY` | Clé privée SSH |
| Secret | `SECRET_KEY` | Django |
| Secret | `DB_PASSWORD` | Postgres + Django |
| Secret | `GHCR_TOKEN` | PAT `read:packages` (pull images) |
| Secret | `GHCR_USER` | User GitHub du PAT |
| Variable | `DEPLOY_PATH` | Ex. `/opt/carburflow` |
| Variable | `DEPLOY_SSH_PORT` | Défaut `22` |
| Variable | `ALLOWED_HOSTS` | Hôtes Django |
| Variable | `CORS_ALLOWED_ORIGINS` | Origines front |
| Variable | `VITE_API_BASE_URL` | URL API bakée au build front (CD Build) |

## Déploiement

GitHub → Actions → **CD Deploy** → `staging` + tag (`latest` ou `sha-…`).

Sur le serveur (manuel) :

```bash
export GHCR_TOKEN=… GHCR_USER=…
export CARBURFLOW_BACKEND_IMAGE=ghcr.io/<owner>/carburflow-backend:latest
export CARBURFLOW_FRONTEND_IMAGE=ghcr.io/<owner>/carburflow-frontend:latest
# .env avec SECRET_KEY, DB_PASSWORD, …
docker compose -f docker/docker-compose.prod.yml up -d
```
