# Carburflow

Carburflow est une application web composée d’un backend Django et d’un frontend React/Vite.

## Structure du dépôt
- backend/: API Django, modèles, vues, serializers et logique métier
  - `apps/authentication`: gestion des comptes, profils et permissions
  - `apps/alerts`: détection, persistance et traitement des alertes métier
  - `apps/notifications`: messagerie interne et notifications in-app
  - `apps/import`: import/export CSV, réinitialisation et outils de migration de données
  - `apps/reports`: création, lecture, import/export et API des rapports de relevés
  - `apps/sites`: modèle Site et métadonnées de site (nom, localisation, statut), utilisé pour organiser les cuves principales
  - `apps/services`: règles métier partagées et utilitaires réutilisables
  - `apps/api`: couche API REST, permissions et serializers partagés
  - `apps/equipment`: modèles métier des équipements (CuvePrincipale, CuveJournaliere, GroupeElectrogene) et validation des identifiants CP/CJ
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