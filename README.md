# Carburflow

Carburflow est une application web composée d’un backend Django et d’un frontend React/Vite.

## Structure du dépôt
- backend/: API Django, modèles, vues, serializers et logique métier.
  Voir le [README du backend](./backend/README.md) pour les détails d'architecture.
  - `apps/authentication`: gestion des comptes, profils et permissions
  - `apps/sites`: modèle Site et métadonnées de site
  - `apps/reports`: création, lecture, import/export et API des rapports de relevés
  - `apps/alerts`: détection, persistance et traitement des alertes métier
  - `apps/notifications`: messagerie interne et notifications in-app
  - `apps/services`: cerveau central (calculs, auth, imports, détection fraude)
  - `apps/api`: point d'entrée unique de l'API REST
  - `apps/equipment`: modèles métier des équipements (Cuves, Groupes)
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

## Production

Un fichier d’exemple est fourni dans [.env.production.example](.env.production.example).

```bash
cp .env.production.example .env.production
# puis renseigner les valeurs réelles de production
```

Pour lancer la stack de production :

```bash
docker compose --env-file .env.production -f docker/docker-compose.prod.yml up -d --build
```

Le workflow GitHub Actions de déploiement s’appuie sur ce même fichier Compose et sur les secrets GitHub de l’environnement `production`.