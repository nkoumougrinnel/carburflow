# Accès public via ngrok (Docker)

Un seul tunnel suffit : le conteneur **frontend** (nginx) sert le SPA et
proxy `/api/` vers le backend.

## Prérequis

- Docker Compose v2
- [ngrok](https://ngrok.com/download) installé et authentifié (`ngrok config add-authtoken …`)

## Démarrage

```bash
# 1) Stack Docker
docker compose -f docker/docker-compose.yml up --build

# 2) Tunnel (vous choisissez le port — défaut 5174)
./scripts/start-ngrok.sh
# ou directement :
ngrok http 5174
# autre port mappé :
# FRONT_PORT=8080 ngrok http 8080
```

Ouvrez l’URL `https://….ngrok-free.app` affichée par ngrok.

## Ce qui est déjà préparé

| Élément | Rôle |
|--------|------|
| Nginx dans `frontend` | SPA + proxy `/api` → `backend:8001` |
| `VITE_API_BASE_URL` vide | Appels relatifs `/api/v1` (même origine que ngrok) |
| `TRUST_NGROK_ORIGINS=true` | CSRF / CORS / ALLOWED_HOSTS pour `*.ngrok*` |
| `ngrok-skip-browser-warning` | Header côté front (plan free) |

## Ports locaux

| Service | Port |
|---------|------|
| Front (+ API via proxy) | **5174** ← cibler ngrok ici |
| API directe (optionnel) | 8001 |
| Postgres | 5432 |

## Sans Docker

```bash
./scripts/start-api.sh
./scripts/start-frontend.sh tunnel   # VITE_TUNNEL=1 (HMR wss)
./scripts/start-ngrok.sh
```

## Dépannage

- **Page d’avertissement ngrok** : cliquez « Visit Site » une fois.
- **DisallowedHost** : vérifiez `TRUST_NGROK_ORIGINS=true` sur le backend (compose).
- **API en `localhost:8001` depuis le téléphone** : rebuild front avec `VITE_API_BASE_URL=""` (défaut compose) pour rester en relatif.
- Après changement front : `docker compose -f docker/docker-compose.yml up --build frontend`.
