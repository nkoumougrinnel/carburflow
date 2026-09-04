# 🎯 PROMPT IA — Harmonisation UI/UX finale CarburFlow (pré-production)

> **Mode d'emploi :** copier-coller ce prompt tel quel dans votre agent de code (Cline, Cursor, Claude Code…) sur la branche `dev`, puis valider les commits chantier par chantier. Chaque chantier est autoportant, avec constat précis, fichiers à modifier et critères d'acceptation mesurables.

---

## 0. RÔLE, CONTEXTE ET MÉTHODE

Tu es **développeur front senior + designer UI** sur **CarburFlow**. Stack front : Vite + React 18 + react-router-dom v6, Tailwind v4 (`@theme inline` dans `frontend/src/index.css`) + feuille globale `frontend/src/styles.css`, composants maison dans `frontend/src/components/ui/` (button, select, modal, status-badge, tank-gauge, empty-state…), lucide-react, GSAP, sonner, recharts. Le projet part en **production dans quelques jours : tolérance de régression zéro**. Le backend Django/DRF ne doit **pas** être modifié.

Avant d'écrire la moindre ligne, **joue le produit dans la tête des 3 personas** et parcours tous leurs écrans :

| Persona | Écrans | Fichiers |
|---|---|---|
| **User (consultation)** | Home, Sites (liste + détail), Rapports (lecture), Notifications, Profil | `frontend/src/pages/user/HomePage.jsx`, `user/SitesPage.jsx`, `common/ReportsPage.jsx`, `common/NotificationsPage.jsx`, `common/ProfilePage.jsx` |
| **Opérateur** | Home (poste de pilotage), Sites (liste + détail + cuves journalières), Relevés (envoi + mes envois), Notifications, Profil | `frontend/src/pages/operator/HomePage.jsx`, `operator/SitesPage.jsx`, `common/ReportsPage.jsx` |
| **Admin (responsable)** | Dashboard, Sites (vue all + détail), Groupes (all + détail), Alertes, Historique, Profils | `frontend/src/pages/admin/DashboardPage.jsx`, `admin/SitesPage.jsx`, `admin/GroupsPage.jsx`, `admin/AlertsPage.jsx`, `common/ReportsPage.jsx` (mode admin), `components/AdminProfilesManager.jsx` |

**Objectif global : uniformiser l'UI/UX dans les 3 comptes** — un même élément (bannière, filtre, bouton, badge, jauge, chip d'alerte, état vide) doit avoir **exactement le même rendu** quel que soit le compte et la page.

### Règles d'or (non négociables)
1. **Design tokens uniquement** : aucune couleur hex en dur dans les fichiers modifiés. Utiliser `var(--primary)`, `var(--primary-2)`, `var(--primary-3)`, `var(--danger)`, `var(--success)`, `var(--accent-warm)`, `var(--panel)`, `var(--panel-soft)`, `var(--border)`, `var(--text)`, `var(--muted)` (définis dans `frontend/src/index.css` :root + `[data-theme="dark"]`).
2. **Une seule source de vérité par pattern** : bannière → `components/WelcomeBanner.jsx` ; jauge → `components/ui/tank-gauge.jsx` ; badge statut → `components/ui/status-badge.jsx` ; select → `components/ui/select.jsx` ; bouton → `components/ui/button.jsx` ; état vide → `components/ui/empty-state.jsx`. Supprimer les doublons locaux.
3. **Aucune donnée mockée visible en prod** (pas de noms de sites ni de compteurs hardcodés).
4. **Dark mode vérifié** sur chaque classe créée/modifiée (`[data-theme="dark"]`).
5. **Responsive** : les filtres sont sur **une seule ligne horizontale** à partir de 1024px ; l'empilement vertical n'est autorisé qu'en dessous de 640px.
6. **Accessibilité** : focus visible, `aria-label` sur tout bouton icône (corbeille…), contrastes AA.
7. Ne rien renommer dans l'API/les props publics, aucune refonte de logique métier, commits atomiques par chantier (`feat(ui): …` / `fix(ui): …`), conformes au style de `CHANGELOG.md`.

---

## 1. CHANTIER 1 — Bannière bleue CarbuFlow sur TOUTES les pages Home & Sites (user + opérateur)

**Constat (audit).** Toutes les pages utilisent la bannière bleue `WelcomeBanner` (`.welcome-banner`, `styles.css` ≈ ligne 583 : dégradé `rgba(15,76,110,…)` → `rgba(26,107,138,…)` sur `var(--primary)`, radius 24px) **SAUF la Home Opérateur**, qui affiche une simple carte blanche `op-hero-action-card` (`operator/HomePage.jsx` ≈ lignes 105-119 ; CSS `styles.css` ≈ 10325 : `background: var(--panel)`). De plus, il traîne **3 bleus différents** pour le même rôle de bannière : le bleu pétrole standard, la variante admin `.welcome-banner--admin` (`#0b3a52 → #145a78 → #1a6b8a`) et les blocs morts `.op-hero-banner` / `.viewer-hero-banner` (`#0b3d7a → #1e40af → #1d4ed8`, `styles.css` ≈ 9101 et 9983).

**Actions.**
1. `operator/HomePage.jsx` : remplacer `<section className="op-hero-action-card">…</section>` par `<WelcomeBanner kicker="Poste de pilotage" title={...} subtitle="Suivez l'état de vos sites et transmettez vos relevés." />` et conserver le CTA « Envoyer un relevé » juste sous la bannière (bouton `Button variant="primary"`, aligné à droite ou dans la bannière si le composant le permet).
2. `styles.css` : unifier le dégradé de `.welcome-banner` sur les tokens → `linear-gradient(135deg, var(--primary) 0%, var(--primary-2) 100%)` ; **supprimer** la déviation `.welcome-banner--admin` (même bleu pour l'admin) ; **supprimer** les blocs morts `.op-hero-banner`, `.viewer-hero-banner`, `.viewer-hero-*`, `.op-hero-content/greeting/illustration` (≈ 9090-9180 et 9931-9990).
3. Nettoyer les artefacts de duplication CSS (sélecteurs orphelins terminant par une virgule suivi d'un commentaire puis d'une nouvelle règle) : `.op-hero-banner ,` (≈ 9094) et `.op-filters-bar ,` (≈ 9578).
4. Home user (`user/HomePage.jsx` ≈ 109) : garder `WelcomeBanner` mais s'assurer que kicker/titre/padding/radius sont identiques aux autres pages (radius 24px, padding 28px 30px, kicker uppercase espacé).

**Critères d'acceptation.**
- Home opérateur, Home user, Sites opérateur, Sites user, Dashboard, Sites admin, Groupes, Alertes, Historique, Notifications, Profil : **même bannière bleue** (mêmes radius, padding, typo kicker, ombre).
- `grep -n "op-hero-action-card" frontend/src` → aucun résultat.
- Dark mode : la bannière reste lisible (texte blanc, glow) dans les 2 thèmes.


---

## 2. CHANTIER 2 — Filtres HORIZONTAUX, même style sur tous les comptes

**Constat (audit).** Il existe **4 barres de filtres différentes** :
1. Admin (`admin/SitesPage.jsx` ≈ 313, `admin/GroupsPage.jsx` ≈ 283) : `.groups-filter-bar` + composant `ui/select.jsx` → fond `var(--panel)`, radius 20px (`styles.css` ≈ 1913).
2. Opérateur (`operator/SitesPage.jsx` ≈ 326) : `.op-filters-bar` + selects custom `.op-select-wrap` (chevron lucide) → fond `var(--bg)`, radius 14px (`styles.css` ≈ 9578).
3. User (`user/SitesPage.jsx` ≈ 259) : `.viewer-filters-bar`, clone de la version opérateur.
4. Rapports (`common/ReportsPage.jsx` ≈ 361) : `.op-envois-filters-bar` (2 `Input` date + boutons), passage en colonne à 900px.

Les media queries incohérentes (840px ici, 900px là) empilent les filtres **verticalement trop tôt** → effet « superposé ». Trois styles visuels distincts pour la même fonction.

**Actions.**
1. Créer dans `styles.css` un pattern unique **`.cf-filter-bar`** : `display:flex; flex-wrap:wrap; gap:0.75rem; align-items:flex-end; background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:0.9rem 1.1rem;` ; chaque champ `flex:1 1 180px; min-width:180px; max-width:280px;` ; boutons d'action en bout de barre avec `margin-left:auto`.
2. Uniformiser les contrôles : `<select>` rendu via `ui/select.jsx` + chevron `ChevronDown` (16px, `var(--muted)`) ; label uppercase `0.78rem` gras `var(--muted)` ; hauteur de contrôle identique (≈ 42px).
3. Remplacer page par page `.groups-filter-bar`, `.op-filters-bar`, `.viewer-filters-bar`, `.op-envois-filters-bar` par `.cf-filter-bar` (alias temporaire autorisé, puis suppression des anciens blocs CSS).
4. **Breakpoint unique** : wrap horizontal ≥ 640px ; colonne uniquement < 640px. Supprimer les règles `flex-direction:column` à 840/900px.
5. Les onglets/chips au-dessus des filtres (`.saas-profile-tabs` des Rapports et Alertes, onglets Notifications) adoptent tous le même style pill (actif = `var(--primary)`).

**Critères d'acceptation.**
- À 1440, 1280 **et 1024px** : Dashboard, Sites admin, Groupes, Sites opérateur, Sites user, Rapports, Alertes → filtres **sur une seule ligne horizontale**, même hauteur/radius/couleurs/labels.
- À 375px : empilement propre, champs pleine largeur, zéro débordement horizontal.


---

## 3. CHANTIER 3 — Bouton corbeille (suppression) ROUGE dans la page Relevés

**Constat (audit — vrai bug).** `common/ReportsPage.jsx` ≈ 535-542 : bouton de suppression = `<Button variant="danger" size="sm"><Trash2 size={14} /></Button>`. Or `components/ui/button.jsx` (ligne 14) définit `danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm'`, alors que le thème Tailwind (`frontend/src/index.css`, `@theme inline` ≈ lignes 99-134) expose **`--color-destructive: var(--danger)`** et **jamais `--color-danger`**. Résultat : la classe `bg-danger` n'est générée par Tailwind nulle part → le bouton **n'a aucun fond** et la corbeille n'apparaît pas rouge.

**Actions.**
1. `components/ui/button.jsx` : corriger le variant → `danger: 'bg-destructive text-white hover:bg-destructive/90 shadow-sm'` (ou ajouter `--color-danger: var(--danger);` dans `@theme inline` — choisir UNE solution et l'appliquer partout).
2. Bouton corbeille (`ReportsPage.jsx` ≈ 535) : garder `variant="danger" size="sm"`, ajouter `aria-label="Supprimer ce relevé"`, conserver `title="Retirer ce relevé"` ; l'icône `Trash2` hérite du blanc.
3. Vérifier les autres usages de `variant="danger"` (bouton « Retirer » de la modale de confirmation `ReportsPage.jsx` ≈ 864 ; `AnimatedBadge` du `Topbar.jsx` a son propre variant) : fond `var(--danger)` (`#b91c1c` clair / `#f87171` sombre), hover nettement visible, taille inchangée.
4. Rouge visible et lisible dans les deux thèmes, focus ring (`focus-visible:ring-2`) présent.

**Critères d'acceptation.**
- Relevés → onglet « Envois » : la corbeille est un **bouton rouge plein** (icône blanche), hover plus sombre ; la modale « Retirer ce relevé ? » a un bouton « Retirer » rouge.
- Aucun autre bouton de l'app n'a changé d'apparence.


---

## 4. CHANTIER 4 — Chips d'alertes identiques : page Groupes = page Sites

**Constat (audit).** `admin/GroupsPage.jsx` ≈ 402-422 affiche le nombre d'alertes avec `.group-alert-chip` (pilule **rouge** définie dans `styles.css` ≈ 1352 : bordure/fond/texte `var(--danger)` via `color-mix`, 0.78rem, gras) + `.group-alert-none`. `admin/SitesPage.jsx` ≈ 417-433 utilise les classes **`site-alert-chip` / `site-alert-none` qui n'existent pas dans `styles.css`** → rendu = `Button variant="secondary"` gris standard. Deux styles très différents pour la même donnée.

**Actions.**
1. `styles.css` : créer un pattern partagé **`.alert-chip`** (reprendre exactement les règles actuelles de `.group-alert-chip` : `display:inline-flex; align-items:center; padding:0.2rem 0.55rem; border-radius:999px; border:1px solid color-mix(in srgb, var(--danger) 40%, var(--border)); background:color-mix(in srgb, var(--danger) 10%, var(--panel)); color:var(--danger); font-size:0.78rem; font-weight:700; cursor:pointer;` + hover : bordure `var(--danger)` pleine) et **`.alert-chip--none`** (`color:var(--muted)`).
2. `admin/GroupsPage.jsx` ET `admin/SitesPage.jsx` : utiliser `className="alert-chip"` / `"alert-chip--none"` ; supprimer `group-alert-chip`, `group-alert-none`, `site-alert-chip`, `site-alert-none`.
3. Comportement identique des deux côtés : `event.stopPropagation()`, navigation vers la page Alertes filtrée (groupId / siteId), `title` listant les alertes.
4. Bonus : même libellé (« 1 alerte » / « 2 alertes »), même pluriel, même état vide (« — »).

**Critères d'acceptation.**
- Vue d'ensemble admin : la colonne « Alertes » de la page Sites et celle de la page Groupes sont **pixel-identiques** (même pilule rouge, même typo, même hover, dark mode OK).
- `grep -rn "group-alert-chip\|site-alert-chip\|group-alert-none\|site-alert-none" frontend/src` → vide.

---

## 5. CHANTIER 5 — UNE SEULE jauge (TankGauge) pour l'opérateur ET le user

**Constat (audit).** Trois implémentations coexistent pour visualiser le même niveau de carburant :
1. `components/ui/tank-gauge.jsx` (`TankGauge` vertical/horizontal, classes `ui-tank-*` + CSS `styles.css` ≈ 9400-9574) — utilisée par l'**opérateur** (liste `operator/SitesPage.jsx` ≈ 428, Home ≈ 237, détail ≈ 178, cuves journalières ≈ 257) et par la Home **user** (watch-cards, `user/HomePage.jsx` ≈ 187).
2. `LargeTankGauge` locale (`user/SitesPage.jsx` ≈ 13-52, classes `viewer-tank-large-*`) pour le **détail user**.
3. `HorizontalTankGauge` locale (`user/SitesPage.jsx` ≈ 54-74, classes `viewer-table-gauge-*`) pour la **liste user**.
Rendus différents (tailles, labels, ombres, typographies) alors que la jauge de la page Sites opérateur est la référence attendue côté user.

**Actions.**
1. `user/SitesPage.jsx` : **supprimer** `LargeTankGauge` et `HorizontalTankGauge` ; utiliser `TankGauge` partout — détail : `<TankGauge variant="vertical" size="lg" showLabels percent currentVolume capacity />` ; liste : `<TankGauge variant="horizontal" size="md" showLabels … />`.
2. Ajuster le CSS `ui-tank-*` (`styles.css`) pour couvrir les tailles du compte user : en `lg`, la grande cuve doit garder une hauteur proche de l'actuelle `viewer-tank-large` (≈ 300px) ; labels `%` + volumes formatés fr-FR (`12 000 / 30 000 L`) sous la cuve et au-dessus de la barre horizontale.
3. Supprimer les blocs CSS morts `viewer-tank-large-*` et `viewer-table-gauge-*` (les aliasser vers `ui-tank-*` le temps de la transition si nécessaire).
4. Seuils de couleur identiques partout : < 20 % rouge (`var(--danger)`-family), < 40 % orange, ≥ 40 % vert ; tooltip `Cuve: X L / Y L (Z %)`.
5. Home user watch-cards : conserver `TankGauge variant="vertical" size="md"` + bloc pourcentage — même rendu que la carte « Mes sites » opérateur (même barre horizontale, même label).

**Critères d'acceptation.**
- Liste Sites opérateur ↔ liste Sites user : **même jauge horizontale** (même hauteur de barre, mêmes labels %/litres).
- Détail site opérateur ↔ détail site user : **même grande cuve verticale**.
- `grep -rn "viewer-tank-large\|viewer-table-gauge" frontend/src` → vide.

---

## 6. MISSIONS D'UNIFORMISATION COMPLÉMENTAIRES (persona par persona)

Après les 5 chantiers, repasse chaque écran et corrige aussi — sans toucher à la logique :

**A. Libellés & badges de statut**
- `user/HomePage.jsx` : `ViewerStatusBadge` ne gère que CRITICAL/WARNING/NORMAL → réutiliser `components/ui/status-badge.jsx` avec les mêmes libellés que l'opérateur (Critique / À surveiller / Normal / Indéterminée / Sans fonctionnement). Extraire la configuration partagée dans `ui/status-badge.jsx` ou `utils/`.
- Vocabulaire unique : « Mes envois », « Ajouter un relevé », « Vue d'ensemble », « Détail », mêmes intitulés de colonnes de tableaux.

**B. Données réelles, zéro mock (prod)**
- `common/ReportsPage.jsx` ≈ 485/498/503 : compteurs fallback `{r.sites_count || 8}`, `{r.groupes_count || 24}`, `{r.lignes_count ?? 33}` → afficher la vraie valeur ou « — ».
- Modale « Voir la liste » (≈ 843-848) : liste **hardcodée** de 8 sites (BEPANDA NATIONAL…) → afficher les sites réels du rapport via l'API existante, ou retirer la modale si la donnée n'existe pas.

**C. États vides / erreurs / chargement**
- Même `EmptyState` partout (remplacer `op-empty-card` / `viewer-empty-card` quand équivalent), mêmes panneaux d'erreur (`.reports-error-panel` unifié), même `PageLoader` avec libellé contextuel.

**D. Tableaux**
- Alignements cohérents (texte à gauche, nombres à droite, états au centre), zébrures + hover identiques entre `.op-table`, `.viewer-table` et les tables admin → mutualiser en `.cf-table`.

**E. Accessibilité & polish**
- `<tr role="link">` → préférer `role="button"` (logique clavier déjà présente) ; `aria-label` sur tous les boutons icônes ; `:focus-visible` cohérent ; ne jamais retirer les animations si `prefers-reduced-motion`.

**F. Dark mode**
- Vérifier `[data-theme="dark"]` sur chaque classe créée/modifiée (bannières, filtres, chips, jauges, boutons danger).

---

## 7. DÉFINITION OF DONE — CHECKLIST QA FINALE (à valider AVANT chaque commit de fusion)

- [ ] `npm run build` (dossier `frontend/`) passe sans erreur ni warning nouveau.
- [ ] **Parcours Admin** : Dashboard → Sites (vue all + détail) → Groupes (all + détail) → Alertes → Historique → Profils. Filtres sur une ligne à 1280/1024px ; chips d'alertes identiques Sites/Groupes.
- [ ] **Parcours Opérateur** : Home (bannière bleue + CTA) → Sites (liste + détail + cuves journalières) → Relevés (upload → vérification → envoi ; onglet Envois : corbeille **rouge** + modale de confirmation).
- [ ] **Parcours User** : Home → Sites (liste + détail : grande cuve = même rendu qu'opérateur) → Rapports (lecture) → Notifications.
- [ ] **Comparaisons côte à côte** : bannières identiques sur les 11 écrans ; jauges user = jauges opérateur ; chips alertes Sites = Groupes ; filtres même style sur les 7 pages filtrables.
- [ ] **Dark mode** activé sur chaque écran visité.
- [ ] **Responsive** 375 / 768 / 1024 / 1440px sans débordement horizontal.
- [ ] Aucun `console.error` React ; aucune props/API modifiée ; **aucun fichier `backend/` touché**.
- [ ] Greps de non-régression tous vides :
  ```bash
  grep -rn "op-hero-action-card\|viewer-tank-large\|viewer-table-gauge\|site-alert-chip\|group-alert-chip\|bg-danger" frontend/src
  ```
- [ ] Livrable : **un commit par chantier** (`feat(ui): bannière home opérateur`, `fix(ui): bouton danger Tailwind token`, …), messages conformes à `CHANGELOG.md`.

---

## 8. ORDRE D'EXÉCUTION RECOMMANDÉ (impact utilisateur maximal d'abord)

1. **Chantier 3** (corbeille rouge) — bug bloquant visible, 10 minutes.
2. **Chantier 1** (bannières bleues) — effet visuel immédiat.
3. **Chantier 2** (filtres horizontaux unifiés) — confort quotidien.
4. **Chantier 5** (jauge unique) — cohérence inter-comptes.
5. **Chantier 4** (chips d'alertes) — cohérence admin.
6. **Missions complémentaires** (§6) — polish final avant mise en prod.


