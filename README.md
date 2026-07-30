# Carburflow

Carburflow est une application web composée d’un backend Django et d’un frontend React/Vite.

## Structure du dépôt
- backend/: API Django, modèles, vues, serializers et logique métier
- frontend/: application React/Vite
- docker/: configuration Docker et fichiers de build
- data/: données d’import, fixtures et exports
- scripts/: scripts utilitaires de déploiement et maintenance
- docs/: documentation technique et utilisateur

## Démarrage rapide
```bash
# depuis la racine du projet
make docker-up
```

## Commandes utiles
```bash
# reconstruire les conteneurs
make docker-build

# redémarrer proprement
make docker-reset
```

## Notes importantes
- Utiliser Docker Compose v2 (`docker compose`) plutôt que `docker-compose`.
- Les variables d’environnement doivent être définies avant le lancement.
- Les données d’import CSV sont stockées dans data/imports/.