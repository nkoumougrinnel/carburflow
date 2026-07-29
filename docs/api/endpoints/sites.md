# Sites API

Base : `/api/v1/`

## Sites (agrégation de cuves)

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/sites/` | Liste des sites |
| POST | `/sites/` | Créer un site |
| GET | `/sites/{id}/` | Détail + cuves principales |
| PUT/PATCH | `/sites/{id}/` | Modifier |
| DELETE | `/sites/{id}/` | Supprimer |

## Cuves principales (identifiant `CPxxx`)

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/cuves-principales/` | Liste (`?site=` filtre) |
| POST | `/cuves-principales/` | Créer (`identifiant` = `CP001`, …) |
| GET | `/cuves-principales/{id}/` | Détail + cuves journalières |

## Groupes électrogènes

| Méthode | URL | Description |
|---------|-----|-------------|
| GET/POST | `/groupes/` | Liste / création |
| GET/PATCH/DELETE | `/groupes/{id}/` | Détail / maj / suppression |

## Cuves journalières

| Méthode | URL | Description |
|---------|-----|-------------|
| GET/POST | `/cuves-journalieres/` | Liste / création |
| GET | `/cuves-journalieres/?site=` | Filtrer par site |
| GET | `/cuves-journalieres/?cuve_principale=` | Filtrer par CP |

## Permissions

- Lecture : ouverte (dev)
- Écriture : admin authentifié
