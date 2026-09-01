# Migration vers l'Architecture Layered (Frontend)

Ce document détaille les motivations et la stratégie de migration de l'architecture frontend de CarburFlow vers une structure modulaire et scalable.

## 1. Constats de l'Architecture Initiale (Legacy)

L'architecture initiale présentait plusieurs limites critiques qui freinaient le développement et augmentaient le risque de bugs :

- **Couplage Fort (Tight Coupling)** : La logique d'appel API, la gestion d'état et l'affichage étaient mélangées dans les composants de page.
- **Concentration des Responsabilités** : Le fichier `auth.js` servait de "fourre-tout" pour toutes les requêtes HTTP du projet, rendant sa maintenance difficile.
- **Redondance du Code** : Des logiques de filtrage et de formatage étaient dupliquées entre différentes pages (ex: `ReportsPage` et `HistoryPage`).
- **Structure de Dossiers Floue** : Les pages étaient stockées à la racine de `src/pages/` sans distinction de rôle (Admin, Opérateur, User).

## 2. La Nouvelle Architecture Proposée

L'objectif est de passer à une **Architecture en Couches (Layered Architecture)** où chaque niveau a une responsabilité unique.

### A. Couche Services (`src/services/api/`)
**Rôle : Communication pure avec le Backend.**
- Création de clients dédiés par domaine (`auth.service.js`, `reports.service.js`, etc.).
- Suppression de toute logique métier ou gestion d'état.
- **Bénéfice** : Si l'URL d'un endpoint change, on ne modifie qu'un seul fichier.

### B. Couche Hooks (`src/hooks/`)
**Rôle : Orchestration des données et logique métier.**
- Création de hooks personnalisés (`useReports`, `useEquipment`, etc.).
- Gestion du cycle de vie des données : `loading`, `error`, `data`.
- Formatage des données reçues avant leur transmission aux composants.
- **Bénéfice** : La logique est réutilisable entre plusieurs pages et les composants deviennent "maigres".

### C. Couche Présentation (`src/pages/` & `src/components/`)
**Rôle : Affichage et interaction utilisateur.**
- Les pages ne font plus d'appels API directs.
- Elles consomment les hooks pour obtenir les données et déclencher des actions.
- Organisation des pages par rôle (`admin/`, `operator/`, `user/`, `common/`).
- **Bénéfice** : Le code UI est pur et facile à modifier sans risquer de casser la logique métier.

## 3. Bénéfices Attendus

| Axe | Impact |
| :--- | :--- |
| **Maintenabilité** | Isolation des bugs. Un problème de calcul est dans le hook, un problème d'affichage est dans la page. |
| **Scalabilité** | Ajout de nouvelles fonctionnalités sans augmenter la complexité cognitive du projet. |
| **Testabilité** | Possibilité de tester la logique métier (hooks) indépendamment de l'interface graphique. |
| **Performance** | Meilleure gestion du cache et optimisation des appels API via les hooks. |
