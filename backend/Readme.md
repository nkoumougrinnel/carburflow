# Backend

Ce dossier contient l’API Django du projet.

## Contenu principal
- apps/: applications métier (alerts, api, authentication, import, notifications, reports, sites)
- core/: configuration Django, URL, settings et middleware
- tests/: tests unitaires et d’intégration

## Commandes utiles
```bash
cd backend
python manage.py migrate
python manage.py runserver
python manage.py test
```

## À savoir
- Les settings sont chargés via `DJANGO_SETTINGS_MODULE`.
- Les imports de données utilisent les scripts présents dans le dossier `import` et les fichiers CSV dans `data/imports`.
- Les migrations doivent être appliquées après tout changement de modèle.