# Reports API

| Méthode | URL | Description |
|---------|-----|-------------|
| GET/POST | `/api/v1/rapports/` | Liste / création |
| GET/PATCH/DELETE | `/api/v1/rapports/{id}/` | Détail (+ lignes) |
| GET/POST | `/api/v1/lignes-rapport/` | Lignes (`?rapport=`) |

# Dashboard analytique (calculs portés)

Mêmes payloads que l’ancien `dashboard` :

| URL | Contenu |
|-----|---------|
| `GET /api/v1/dashboard/overview` | résumé, sites, groupes, alertes |
| `GET /api/v1/dashboard/sites` | séries volume / conso / heures / autonomie |
| `GET /api/v1/dashboard/groupes` | blocs groupes (`?site_id=`) |
| `GET /api/v1/dashboard/cuves` | cuves CP/CJ (`?site_id=&rapport_debut=&rapport_fin=`) |

Calculs : `apps/api/services/calculs.py` + `analytics.py`  
(logique inchangée, modèles `apps.sites` + `apps.reports`).

## Migration données legacy

```bash
python manage.py migrate_dashboard_data --dry-run
python manage.py migrate_dashboard_data --flush-target
```
