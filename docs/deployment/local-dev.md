# Développement local

## Sans Docker
```bash
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
```

Frontend : `cd frontend && npm install && npm run dev` (port 5173).

## Avec Docker

Utiliser **`docker compose`** (plugin v2+), **jamais** `docker-compose` (v1.29) :
- `KeyError: 'ContainerConfig'` au `up`
- crash au Ctrl+C (`Thread-7 watch_events`)

```bash
# depuis la racine du repo
make docker-up
# ou
docker compose -f docker/docker-compose.yml up --build
```

Si tu as déjà lancé v1 et que tu as `ContainerConfig` :

```bash
make docker-reset
# ou à la main :
docker compose -f docker/docker-compose.yml down --remove-orphans
docker rm -f docker_db_1 docker_backend_1 docker_frontend_1
docker compose -f docker/docker-compose.yml up --build --force-recreate
```

Permission refusée sur le socket Docker :

```bash
sudo usermod -aG docker "$USER"
# puis se déconnecter / reconnecter
```

Services :
- Front (+ API via nginx) : http://localhost:5174/
- API directe : http://localhost:8001/api/v1/
- Postgres : localhost:5432 (`carburflow` / `carburflow`)

Accès Internet (ngrok) : un tunnel sur **5174** suffit — voir [`ngrok.md`](ngrok.md).

Données initiales : au premier démarrage (`RUN_SEED=1`), le backend lance `seed_accounts` puis `reset_and_import` si aucun site n’existe. Les CSV viennent de `data/imports/` (copiés dans l’image). Pour tout recharger : `docker compose -f docker/docker-compose.yml down -v` puis `make docker-up`, ou `RUN_IMPORT_FORCE=1`.

Arrêt : `make docker-down` ou `docker compose -f docker/docker-compose.yml down`.
