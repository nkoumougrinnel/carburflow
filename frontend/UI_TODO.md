# UI/UX TODO List — CarburFlow

Ce document recense les améliorations d'interface et d'expérience utilisateur à implémenter pour transformer CarburFlow en un produit professionnel.

## 1. Landing Page (Vitrine CAMTEL)
- [ ] **Refonte Visuelle** : Passer d'une page générique à une vitrine orientée "Produit Entreprise" pour CAMTEL.
- [ ] **Section Équipe** : Intégrer les photos et rôles des 6 membres de la Team Ultime.
- [ ] **Présentation des Fonctionnalités** : Remplacer les descriptions vagues par des captures d'écran ou des icônes illustrant les vrais modules (Lutte contre la fraude, Suivi des stocks, etc.).
- [ ] **Identité Visuelle** : Aligner les couleurs et la typographie sur la charte graphique de CAMTEL.

## 2. Barre de Navigation
- [x] **Badge de notification animé** (pulse/bounce) sur les liens et boutons.
- [x] **Menu mobile optimisé** avec overlay, fermeture via Échap/clic extérieur, navigation par rôle.
- [x] **Panneau de notifications** avec filtres (Toutes / Alertes / Messages), états vide et chargement.
- [x] **Menu déroulant utilisateur** (UserMenu) avec avatar, rôle, actions (thème, profil, déconnexion).
- [x] **Focus visible** sur tous les éléments interactifs (accessibilité clavier).
- [x] **Effet de scroll** (ombre portée) sur la barre en haut de page.
- [ ] **Menu déroulant de sous-pages** pour les sections complexes.

## 3. Tableaux de données
- [x] **Composant DataTable réutilisable** avec :
  - Tri par colonne (asc/desc avec icônes)
  - Recherche textuelle globale
  - Pagination avec numéros et ellipses
  - Export CSV (séparateur `;`, encodage UTF-8 avec BOM)
  - État vide personnalisable
  - Lignes cliquables + classes personnalisables (rowClassName)
- [x] **Intégration dans le Dashboard admin** : les 4 tableaux (Autonomie des sites, Écarts horaires, Groupes gourmands, Sites gourmands) utilisent désormais DataTable.
- [ ] **Intégration dans les autres pages** (Sites, Groupes, Rapports, Alertes, Espaces opérateur/utilisateur).
- [ ] **Filtres avancés par colonne** (sélecteurs dédiés).

## 4. Animations fluides
- [x] **Fichier animations.css** avec :
  - Card hover lift & glow (élévation + halo)
  - Stagger reveal (apparition échelonnée des listes)
  - Page enter transition (fade + slide)
  - Skeleton shimmer (squelettes de chargement)
  - Bouton micro-interactions (press scale)
  - Gradient animé (fond des headers)
  - Pulse dot (indicateur live)
  - Row hover slide (barre latérale)
  - Fade-up générique
- [x] **Respect de `prefers-reduced-motion`** (accessibilité).
- [x] **Transition douce du thème** clair/sombre (couleurs, bordures, ombres).
- [ ] **Animations GSAP avancées** sur les transitions de route.

## 5. Rendu visuel des pages (bonus)
- [ ] Appliquer `cf-hover-lift` et `cf-stagger` aux cards des pages Sites/Groups/Reports.
- [ ] Appliquer `cf-skeleton` pour les loader des tableaux et graphiques.
- [ ] Tester responsive des nouveaux composants sur mobile (368px / 768px / 1024px).

