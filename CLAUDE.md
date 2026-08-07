# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Carburflow — application de gestion de cuves de carburant, groupes électrogènes et rapports journaliers. Monorepo à deux services principaux:

- **Backend**: Django 5 + Django REST Framework, base PostgreSQL (Docker) ou SQLite (dev local), auth par token (`rest_framework.authtoken`) et par session.
- **Frontend**: React 18 + Vite, TailwindCSS v4, axios, React Router custom (routing par `pathname` dans `App.jsx`, pas de `react-router`), contexte Redux Toolkit initialisé mais `store.js` est actuellement vide.

L’API est exposée sous `/api/v1/`. La racine Django ne monte QUE cette nouvelle architecture (`backend/core/urls.py`). Le code legacy éventuel est conservé dans `backend/apps/api/urls.py` (imports directs vers `dashboard.*`) mais n’est pas câblé dans `core/urls`.

## Layout

```
carburflow/
├── backend/                      # Django (manage.py à la racine)
│   ├── manage.py                 # DJANGO_SETTINGS_MODULE=core.settings.dev par défaut
│   ├── core/                     # settings (base, dev, local, prod), urls racine, wsgi/asgi, celery
│   ├── apps/
│   │   ├── authentication/       # ProfilUtilisateur (rôles: super_admin, admin, agent, user)
│   │   ├── sites/                # Site, CuvePrincipale, CuveJournaliere, GroupeElectrogene
│   │   ├── reports/              # Rapport, LigneRapport, serializers, normalisations
│   │   ├── alerts/               # alerts + service notifier
│   │   ├── notifications/
│   │   ├── import/               # parsers/validators CSV + commandes import_data/export_data
│   │   └── api/                  # v1: urls.py + views.py + dashboard_views.py + auth_serializers/views
│   ├── tests/{unit,integration}  # pytest + factory-boy
│   ├── scripts/                  # backup_database, generate_fake_data, import_from_csv, migrate_data
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # router custom par pathname, RBAC par rôle (admin/operateur/user)
│   │   ├── main.jsx, index.css, styles.css
│   │   ├── auth.js               # requêtes login/register/logout/me, persistance token/user
│   │   ├── context/              # AuthContext, ThemeContext
│   │   ├── hooks/                # useAuth, useData, useChartPalette
│   │   ├── services/             # api.js (axios), interceptors.js, services/api/{auth,alerts,reports,sites}.js
│   │   ├── store/                # Redux Toolkit (slices + store.js vide pour l’instant)
│   │   ├── pages/                # HomePage, DashboardPage, SitesPage, CuvesPage, GroupsPage,
│   │   │                         # AuthPage, ReportsPage, AlertsPage, NotificationsPage, ProfilePage,
│   │   │                         # OperatorHomePage, UserHomePage + sous-dossiers par feature (.gitkeep)
│   │   ├── components/           # InteractionShell, MetricPanel, PageLoader, landing/, reactbits/, ui/
│   │   ├── utils/, lib/
│   │   └── styles/{global.css, themes, variables.css}
│   ├── vite.config.js            # port 5174, proxy /api → 127.0.0.1:8001, HMR wss pour VITE_TUNNEL=1
│   └── package.json
├── docker/                       # docker-compose.yml (Postgres 16 + backend + frontend/nginx)
├── data/imports/                 # CSV init seedés dans l’image Docker
├── scripts/                      # start-*, backup/restore, seed-db, health-check, reset-db, deploy
├── Makefile                      # docker-up, docker-down, docker-reset, backend-test
├── .env.example                  # DEBUG, SECRET_KEY, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, …
├── db.sqlite3                    # base locale dev
└── docs/
```

## Commandes courantes (depuis la racine `carburflow/`)

### Docker (workflow de référence)

```bash
make docker-up       # build + up (docker compose v2 — JAMAIS docker-compose v1)
make docker-down
make docker-reset    # down -v + rm conteneurs + rebuild (destructif)
```

Le `Makefile` refuse explicitement `docker-compose` v1 (KeyError `ContainerConfig` sur Ctrl+C).

- Ports: backend `8001`, frontend `5174` (SPA servie par nginx avec proxy `/api` → `backend:8001`), postgres `5432`.
- Variables clés côté backend: `DJANGO_SETTINGS_MODULE=core.settings.prod`, `RUN_SEED=1` (peuple démo + `reset_and_import` si la base n’a aucun site), `RUN_IMPORT_FORCE=1` (réimport destructif), `TRUST_NGROK_ORIGINS=true`, `CORS_ALLOWED_ORIGINS`.
- Comptes démo (créés par `apps/authentication/management/commands/seed_accounts.py`):
  - `admin` / `admin` (super_admin)
  - `operateur` / `operateur123` (agent)
  - `user` / `user123` (user)

### Backend (hors Docker, dev local SQLite)

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_accounts            # crée les 3 comptes démo + tokens
python manage.py import_data              # importe data/imports/*.csv
python manage.py runserver 0.0.0.0:8001
```

`DJANGO_SETTINGS_MODULE` par défaut: `core.settings.dev` (SQLite à `db.sqlite3`, CORS ouvert). `core.settings.local` est un doublon debug-friendly.

### Tests backend

```bash
make backend-test     # exécute: cd backend && pytest tests -q
# un fichier:
cd backend && pytest tests/unit/test_models.py -q
# un test précis:
cd backend && pytest tests/unit/test_models.py::TestClass::test_name -q
```

Stack: pytest 8 + pytest-django + factory-boy.

### Frontend

```bash
cd frontend
npm install
npm run dev                # Vite, port 5174, proxy /api -> 127.0.0.1:8001
npm run dev:tunnel         # VITE_TUNNEL=1 — HMR en wss:443 (ngrok, Dev Tunnels, Cloudflare)
npm run build              # build prod
npm run preview
```

Le `vite.config.js` exige `host: true`, `allowedHosts: true` (sinon « Blocked request » derrière ngrok) et proxifie `/api`, `/docs`, `/schema`, `/redoc` vers le backend.

## Architecture & conventions

### Backend — apps par domaine métier

Chaque app suit la structure Django standard: `models.py`, `serializers.py`, `views.py`, `urls.py`, `admin.py`, `migrations/`, parfois `services/` (logique métier pure) et `management/commands/`.

- **`apps.authentication`** — étend `User` via `ProfilUtilisateur` (rôles exposés: `admin`, `operateur`, `user`). `ProfilUtilisateur.role_api` est l’API publique consommée par le front.
- **`apps.sites`** — `Site`, `CuvePrincipale`, `CuveJournaliere`, `GroupeElectrogene`, utils `calculs.py`, `migrate_dashboard_data` (legacy). ViewSets DRF standard.
- **`apps.reports`** — `Rapport` (période) + `LigneRapport` (mesures par jour/cuve/groupe), `norme.py`, `sequence_utils.py`. Commandes: `analyze_rapport`, `create_rapport_entities`, `import_rapport_lignes`.
- **`apps.alerts`** — services/notifier pour les alertes.
- **`apps.import`** — parsers/validators CSV; `import_data` / `export_data` (sync) et `reset_and_import` (Docker entrypoint, déclenché via `RUN_SEED`/`RUN_IMPORT_FORCE`).
- **`apps.notifications`** — app métier vide côté code public.
- **`apps.api.v1`** — point d’entrée unique: `urls.py` monte `auth/`, `sites`, `reports`, `alerts`, `notifications`, `dashboard/*`, et la doc OpenAPI (`/schema/`, `/docs/`, `/redoc/`).

### Authentification

Token DRF + session Django. CORS géré par `core.middleware.CorsMiddleware` (lecture de `CORS_ALLOWED_ORIGINS`). `core.middleware.TrustNgrokOriginMiddleware` ajoute automatiquement les hôtes `*.ngrok*` aux origines de confiance quand `TRUST_NGROK_ORIGINS=true` (utile pour `ngrok http 5174`).

### Frontend — routing & RBAC

- Pas de `react-router`. `App.jsx` mappe `window.location.pathname` vers une `view` (`home`, `login`, `register`, `dashboard`, `sites`, `cuves`, `groups`, `reports`, `alerts`, `notifications`, `profile`, `operator`, `viewer`).
- `navigate(view, options)` est la seule API de navigation; elle pousse l’URL via `history.pushState` et accepte des options (siteId, groupId, alertId, pane).
- Le rôle est résolu dans `AuthContext` (`resolveRole`): `admin` / `operateur` / `user`. Chaque rôle a un set de vues autorisées (`ADMIN_VIEWS`, `OPERATOR_VIEWS`, `VIEWER_VIEWS`) et une vue par défaut (`dashboard`, `operator`, `viewer`).
- `auth.js` encapsule les requêtes (`loginRequest`, `registerRequest`, `meRequest`, `logoutRequest`, `updateProfileRequest`, `changePasswordRequest`) et la persistance localStorage du token + user.
- L’API client est dans `services/api.js` (axios, `baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1'`, `withCredentials: true`).
- `store/store.js` (Redux Toolkit) est **vide** — la majorité de l’état vit dans les contextes. Les `slices` et `services/api/*` sont des scaffolds à compléter.
- Sous-dossiers `pages/<feature>/` et `components/<feature>/` exposent un `index.js` re-exportant un `Component` par défaut (pattern utilisé dans `.gitkeep` + `index.js`).

### Données d’amorçage

`data/imports/*.csv` est l’entrée de `import_data` et est embarqué dans l’image Docker (`COPY data/imports /app/data/imports`). CSVs: `sites`, `users`, `groupes`, `cuves_principales`, `cuves_journalieres`, `cuve_journaliere_groupe`, `lignes_rapport`.

## Notes d'environnement

- `core.settings.local.py` et `dev.py` sont quasi-identiques (DEBUG, ALLOWED_HOSTS=`*`); `local.py` est conservé pour les setups « override minimal » — utiliser `dev.py` par défaut.
- Locale: `fr-fr`, fuseau `Africa/Douala`.
- Validation mot de passe: longueur min 6.
- `db.sqlite3` à la racine est créé par les runs en settings dev — ne pas le committer.
- Le frontend peut être lancé avec `VITE_TUNNEL=1` pour HMR en HTTPS (cf. `vite.config.js`); nginx Docker (5174) est prévu pour ngrok en proxy unique.
