# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Carburflow — application de gestion de cuves de carburant, groupes électrogènes et rapports journaliers. Monorepo à deux services principaux:

- **Backend**: Django 5 + Django REST Framework, base PostgreSQL (Docker) ou SQLite (dev local), auth par token (`rest_framework.authtoken`) et par session.
- **Frontend**: React 18 + Vite, TailwindCSS v4, react-router-dom v7 (`BrowserRouter` dans `main.jsx`, routes dans `App.jsx`), navigation métier par `navigate(view)` (hook `useAppNavigate`). Pas de store global : l’état vit dans les contextes.

L’API est exposée sous `/api/v1/`. La racine Django ne monte QUE cette nouvelle architecture (`backend/core/urls.py`). Le code legacy éventuel est conservé dans `backend/apps/api/urls.py` (imports directs vers `dashboard.*`) mais n’est pas câblé dans `core/urls`.

## Layout

```
carburflow/
├── backend/                      # Django (manage.py à la racine)
│   ├── manage.py                 # DJANGO_SETTINGS_MODULE=core.settings.dev par défaut
│   ├── core/                     # settings (base, dev, local, prod), urls racine, wsgi/asgi, celery
│   ├── apps/
│   │   ├── authentication/       # ProfilUtilisateur (role_api) + commande seed_accounts
│   │   ├── sites/                # Site
│   │   ├── equipment/            # CuvePrincipale, CuveJournaliere, GroupeElectrogene
│   │   ├── reports/              # Rapport, LigneRapport + commandes rapport
│   │   ├── alerts/               # alertes + commande detect_alertes
│   │   ├── notifications/
│   │   ├── services/             # commandes import_data / export_data / reset_and_import / reset_data
│   │   └── api/                  # v1: urls.py + permissions.py + views/{analytics,base,equipment,reports}.py
│   ├── tests/unit                # 6 fichiers pytest (SQLite en mémoire, core.settings.test)
│   ├── scripts/                  # (vide — scaffold)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # routes react-router-dom (Routes/Route/Navigate), RBAC par rôle (admin/operateur/user)
│   │   ├── main.jsx, index.css, styles.css
│   │   ├── auth.js               # requêtes login/register/logout/me, persistance token/user
│   │   ├── context/              # AuthContext, ThemeContext
│   │   ├── hooks/                # useAppNavigate, useChartPalette (useAuth exposé par context/AuthContext)
│   │   ├── services/             # placeholder (README) — future couche API
│   │   ├── pages/                # par rôle : admin/{Dashboard,Sites,Groups,Alerts}Page,
│   │   │                         # auth/AuthPage, common/{Home,Reports,Notifications,Profile}Page,
│   │   │                         # operator/{Home,Sites}Page, user/{Home,Sites}Page
│   │   ├── components/           # InteractionShell, Topbar, BrandLogo, NavLink, MetricPanel,
│   │   │                         # PageLoader, … + landing/, reactbits/, reports/, ui/
│   │   ├── utils/, lib/
│   │   └── styles/ (README)      # styles principaux : src/index.css + src/styles.css
│   ├── vite.config.js            # port 5174, proxy /api → 127.0.0.1:8001, HMR wss pour VITE_TUNNEL=1
│   └── package.json
├── docker/                       # docker-compose.yml (Postgres 16 + backend + frontend/nginx)
├── data/imports/                 # CSV init seedés dans l’image Docker
├── scripts/                      # backup.sh, restore.sh, seed-db.sh, health-check.sh, reset-db.sh, deploy.sh
├── Makefile                      # docker-up, docker-down, docker-reset, backend-test
├── .env.example                  # SECRET_KEY, DJANGO_SETTINGS_MODULE, ALLOWED_HOSTS, DB_*, VITE_API_BASE_URL, …
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
- **`apps.sites`** — `Site`. ViewSets DRF standard.
- **`apps.equipment`** — `CuvePrincipale`, `CuveJournaliere`, `GroupeElectrogene` (l’équipement rattaché aux sites).
- **`apps.reports`** — `Rapport` (période) + `LigneRapport` (mesures par jour/cuve/groupe), `norme.py`. Commandes: `analyze_rapport`, `create_rapport_entities`, `import_rapport_lignes`.
- **`apps.alerts`** — services/notifier pour les alertes + commande `detect_alertes`.
- **`apps.services`** — commandes données: `import_data` / `export_data` et `reset_and_import` / `reset_data` (Docker entrypoint, déclenché via `RUN_SEED`/`RUN_IMPORT_FORCE`).
- **`apps.notifications`** — app métier vide côté code public.
- **`apps.api.v1`** — point d’entrée unique: `urls.py` monte `auth/`, `sites`, `reports`, `alerts`, `notifications`, `dashboard/*`, et la doc OpenAPI (`/schema/`, `/docs/`, `/redoc/`).

### Authentification

Token DRF + session Django. CORS géré par `core.middleware.CorsMiddleware` (lecture de `CORS_ALLOWED_ORIGINS`). `core.middleware.TrustNgrokOriginMiddleware` ajoute automatiquement les hôtes `*.ngrok*` aux origines de confiance quand `TRUST_NGROK_ORIGINS=true` (utile pour `ngrok http 5174`).

### Frontend — routing & RBAC

- `react-router-dom` v7 est utilisé : `BrowserRouter` dans `main.jsx`, `Routes`/`Route`/`Navigate`/`useLocation` dans `App.jsx`, `NavLink` dans `components/NavLink.jsx`, `useNavigate` dans `hooks/useAppNavigate.js`.
- `App.jsx` mappe le `pathname` vers une `view` (`home`, `login`, `register`, `dashboard`, `sites`, `cuves`, `groups`, `reports`, `alerts`, `notifications`, `profile`, `operator`, `viewer`).
- `navigate(view, options)` (hook `useAppNavigate`) est l’API de navigation métier : contrôle d’accès par rôle puis délégation au `navigate` de react-router (`pathForView` + `searchForView`), avec options (`siteId`, `groupId`, `alertId`, `pane`, `replace`).
- Le rôle est résolu dans `AuthContext` (`resolveRole`): `admin` / `operateur` / `user`. Chaque rôle a un set de vues autorisées (`ADMIN_VIEWS`, `OPERATOR_VIEWS`, `VIEWER_VIEWS`) et une vue par défaut (`dashboard`, `operator`, `viewer`).
- `auth.js` encapsule les requêtes (`loginRequest`, `registerRequest`, `meRequest`, `logoutRequest`, `updateProfileRequest`, `changePasswordRequest`) et la persistance localStorage du token + user.
- Les appels API passent par `resolveApiUrl()` / `apiFetch()` dans `auth.js` (fetch natif, pas axios) : chemins relatifs `/api/...` par défaut, surcharge via `VITE_API_BASE_URL` (vide = même origine via proxy Vite / nginx).
- Aucun store global (pas de Redux dans les dépendances) : l’état vit dans les contextes (`AuthContext`, `ThemeContext`) ; `services/` ne contient qu’un README (scaffold d’une future couche API).
- Sous-dossiers `pages/<feature>/` et `components/<feature>/` exposent un `index.js` re-exportant un `Component` par défaut (pattern utilisé dans `.gitkeep` + `index.js`).

### Données d’amorçage

`data/imports/*.csv` est l’entrée de `import_data` et est embarqué dans l’image Docker (`COPY data/imports /app/data/imports`). CSVs: `sites`, `users`, `groupes`, `cuves_principales`, `cuves_journalieres`, `cuve_journaliere_groupe`, `lignes_rapport`, `rapport`.

## Notes d'environnement

- `core.settings.local.py` et `dev.py` sont quasi-identiques (DEBUG, ALLOWED_HOSTS=`*`); `local.py` est conservé pour les setups « override minimal » — utiliser `dev.py` par défaut.
- Locale: `fr-fr`, fuseau `Africa/Douala`.
- Validation mot de passe: longueur min 6.
- `db.sqlite3` à la racine est créé par les runs en settings dev — ne pas le committer.
- Le frontend peut être lancé avec `VITE_TUNNEL=1` pour HMR en HTTPS (cf. `vite.config.js`); nginx Docker (5174) est prévu pour ngrok en proxy unique.
