# Docker CarburFlow

## Important

Utiliser **`docker compose`** (v2+), pas `docker-compose` (v1).

```bash
# Dev local (build context) — depuis la racine
make docker-up

# ou depuis ce dossier
docker compose up --build
```

Prod (images GHCR) : `docker-compose.prod.yml` — voir `docs/deployment/staging.md` et `production.md`.

## CI/CD (GitHub Actions)

| Workflow | Fichier | Rôle |
|----------|---------|------|
| CI | `.github/workflows/ci.yml` | Pytest + build frontend |
| CD Build | `.github/workflows/cd-build.yml` | Push images GHCR |
| CD Deploy | `.github/workflows/cd-deploy.yml` | SSH + pull/up (`staging` / `production`) |

Le front est servi par **nginx** (SPA + proxy `/api` → backend) : l’API est appelée en relatif (`/api/v1`), compatible **ngrok sur le port 5174**. Après un changement front, rebuild : `docker compose up --build frontend`.

Accès public : voir [`docs/deployment/ngrok.md`](../docs/deployment/ngrok.md) — `./scripts/start-ngrok.sh` ou `ngrok http 5174`.

Au démarrage backend (`RUN_SEED=1`) : comptes démo + `reset_and_import` si la base n’a aucun site (CSV dans l’image : `data/imports/`). Pour forcer un réimport : `RUN_IMPORT_FORCE=1` ou `docker compose down -v` puis `up --build`.

`docker-compose` v1.29 provoque `KeyError: 'ContainerConfig'` avec Docker Engine récent. En cas d’erreur : `make docker-reset` depuis la racine.
