# Docker CarburFlow

## Important

Utiliser **`docker compose`** (v2+), pas `docker-compose` (v1).

```bash
# depuis la racine du repo
make docker-up

# ou depuis ce dossier
docker compose up --build
```

Le front est servi en statique (`serve`) : l’API est appelée via `VITE_API_BASE_URL` (hôte `http://localhost:8001/api/v1`), pas en relatif. Après un changement front, rebuild : `docker compose up --build frontend`.

Au démarrage backend (`RUN_SEED=1`) : comptes démo + `reset_and_import` si la base n’a aucun site (CSV dans l’image : `data/imports/`). Pour forcer un réimport : `RUN_IMPORT_FORCE=1` ou `docker compose down -v` puis `up --build`.

`docker-compose` v1.29 provoque `KeyError: 'ContainerConfig'` avec Docker Engine récent. En cas d’erreur : `make docker-reset` depuis la racine.
