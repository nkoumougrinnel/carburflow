# Frontend

Ce dossier contient l’application web React/Vite.

## Structure principale
- src/components/: composants réutilisables
- src/pages/: pages de l’application
- src/services/: appels API et clients HTTP
- src/context/: contexte React global
- src/hooks/: hooks personnalisés
- src/styles/: styles et thèmes
- public/: fichiers statiques

## Commandes utiles
```bash
cd frontend
npm install
npm run dev
```

## À savoir
- L’URL de l’API est généralement définie via des variables d’environnement front.
- Les assets publics doivent être placés dans `public/`.
- Les services API doivent rester centralisés dans `src/services/` pour faciliter la maintenance.