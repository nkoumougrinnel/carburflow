# MANUEL D'UTILISATION — CARBURFLOW

> **Version 1.0 — Septembre 2026**
> Plateforme de gestion et de surveillance du carburant pour réseaux de sites distants (antennes relais, centres de données, sites télécoms…).

---

# 1. Présentation générale

## 1.1. Présentation de CarburFlow

CarburFlow est une application web dédiée à la **gestion et à la surveillance du carburant** sur des réseaux de sites distants équipés de groupes électrogènes. Elle centralise les relevés terrain, calcule automatiquement les consommations et détecte les anomalies (fuites, fraudes, risques de panne sèche) afin d'aider les responsables à prendre les bonnes décisions au bon moment.

L'application a été pensée pour trois usages complémentaires :

* **Piloter** le parc de cuves et de groupes à distance.
* **Détecter** automatiquement les situations anormales via un moteur d'alertes.
* **Auditer** les relevés saisis par les opérateurs terrain.

[📷 **Capture :** Page de connexion / page d'accueil publique — *à insérer ici*]

---

## 1.2. Objectifs de la plateforme

CarburFlow poursuit quatre objectifs majeurs :

1. **Lutter contre la fraude et le gaspillage** de carburant en comparant en continu la consommation réelle aux valeurs de référence.
2. **Garantir la continuité de service** en surveillant les niveaux de cuves et en alertant avant la panne sèche.
3. **Fluidifier le cycle de relevés** entre les agents terrain et le centre de pilotage.
4. **Fournir des indicateurs fiables** (consommation, autonomie, écarts) pour le reporting.

---

## 1.3. Organisation des données : Site → Cuves → Groupes → Relevés

CarburFlow s'appuie sur une **pyramide hiérarchique stricte**. Toute la logique de l'application repose sur cet ordre :

```
Site
 └─ Cuve Principale (CP)         ← stockage massif, reçoit les dépotages
     └─ Cuve Journalière (CJ)    ← réservoir tampon, alimente le(s) groupe(s)
         └─ Groupe Électrogène   ← consomme le carburant
```

* **Site** : unité d'organisation la plus haute (ex. *Bepanda International*). Un site = **une** Cuve Principale.
* **Cuve Principale (CPxxx, ex. CP001)** : réservoir de stockage massif où s'effectuent les **dépotages** (remplissages par camion-citerne).
* **Cuve Journalière (CJxxx, ex. CJ001)** : réservoir tampon plus petit qui alimente directement les groupes. Une CJ est toujours rattachée à une CP.
* **Groupe Électrogène (Gxx-XXXX-xxx, ex. G1-SDMO-830)** : la machine qui consomme réellement le carburant. Elle est alimentée par une CJ.
* **Relevés (Rapport / Lignes de rapport)** : ce que l'opérateur saisit chaque semaine : niveaux (CP, CJ), compteur horaire du groupe, dépotage.

> 💡 **À retenir :** aucun relevé n'existe sans un rapport rattaché à un site et à une période donnée. C'est cette chaîne qui permet à CarburFlow de calculer les consommations et de détecter les alertes.

[📷 **Capture :** Schéma de la pyramide Site → CP → CJ → Groupe — *à insérer ici*]

---

## 1.4. Les trois profils utilisateurs

L'accès aux fonctionnalités est strictement segmenté. Chaque profil dispose d'un **espace dédié**, d'un **menu de navigation** propre et d'un **ensemble d'actions** autorisé.

| Profil | Rôle technique | Objectif principal | Modules accessibles |
|--------|----------------|--------------------|---------------------|
| **Responsable / Administrateur** | `ADMIN` | Analyser, superviser, administrer le parc | Tableau de bord, Alertes, Sites, Groupes, Relevés, Utilisateurs, Profil |
| **Opérateur (Agent terrain)** | `AGENT` | Saisir et transmettre les relevés terrain | Accueil (Poste de pilotage), Sites, Relevés, Profil |
| **Utilisateur (Consultation)** | `USER` | Consulter l'état du parc sans rien modifier | Accueil, Sites, Profil |

> 🔒 Un utilisateur ne voit **que** les pages correspondant à son rôle. Les menus non autorisés ne sont pas affichés et les routes sont protégées côté backend.

[📷 **Capture :** Trois bandeaux d'en-tête côte à côte (Responsable, Opérateur, Utilisateur) — *à insérer ici*]

### Ce que chaque profil peut faire — et ne pas faire

| Action | Responsable | Opérateur | Utilisateur |
|--------|:-----------:|:---------:|:-----------:|
| Voir le tableau de bord global | ✅ | ❌ | ❌ |
| Voir les alertes et les traiter | ✅ | ❌ | ❌ |
| Importer / supprimer un rapport | ✅ | ❌ | ❌ |
| Saisir un relevé et le transmettre | ❌ | ✅ | ❌ |
| Consulter la liste des sites | ✅ (tous) | ✅ (ses sites) | ✅ (ses sites) |
| Voir le détail d'un site / d'un groupe | ✅ | ✅ | ✅ |
| Gérer les comptes utilisateurs | ✅ | ❌ | ❌ |
| Modifier son propre profil / mot de passe | ✅ | ✅ | ✅ |

---

## 1.5. Accès et connexion à la plateforme

1. Ouvrir l'URL de CarburFlow fournie par votre administrateur (ex. `https://carburflow.example.com`).
2. Saisir votre **identifiant** et votre **mot de passe** sur la page de connexion.
3. Cliquer sur **Se connecter**.

Une fois authentifié, vous êtes automatiquement redirigé vers **la page d'accueil de votre profil** :

* Responsable → **Tableau de bord**
* Opérateur → **Poste de pilotage** (Accueil opérateur)
* Utilisateur → **Espace consultation** (Accueil utilisateur)

En haut à droite, vous trouvez en permanence votre **nom**, votre **rôle** (badge) et le bouton **Déconnexion**. Le bouton lune/soleil permet de basculer entre le thème clair et le thème sombre.

[📷 **Capture :** Page de connexion de CarburFlow — *à insérer ici*]

> 💡 **Premier accès ?** Votre mot de passe vous est remis par l'administrateur. Modifiez-le immédiatement depuis votre **Profil → Mot de passe**.

---

# 2. Guide du Responsable / Administrateur

> **Vous êtes Responsable / Administrateur ?** Vous avez la vision la plus complète du parc et le plus de pouvoirs. Ce guide détaille, écran par écran, ce que vous pouvez faire et comment le faire.

## 2.1. Vue d'ensemble de votre espace

### Navigation

Une **barre de navigation supérieure** est affichée en permanence. Elle contient, de gauche à droite :

1. Le **logo CarburFlow** et la mention *« Pilotage carburant »`.
2. Les **modules** de votre espace :
   * **Tableau de bord** (`/admin/dashboard`)
   * **Alertes** (`/admin/alerts`) — avec un badge rouge indiquant le nombre d'alertes à traiter
   * **Sites** (`/admin/sites`)
   * **Groupes** (`/admin/groups`)
   * **Relevés** (`/admin/reports`)
   * **Comptes** (`/admin/accounts`)
3. À droite, votre **nom** (*Admin CarburFlow*), le **badge de rôle** (*RESPONSABLE*) et le bouton **Déconnexion**.
4. Le bouton de **bascule de thème** (clair / sombre).

[📷 **Capture :** Barre de navigation du Responsable avec tous les menus visibles — *à insérer ici*]

### Modules accessibles

| Module | Rôle principal |
|--------|----------------|
| Tableau de bord | Vision synthétique du parc et accès rapide aux situations critiques |
| Alertes | Centralise toutes les anomalies détectées, à trier et à traiter |
| Sites | Liste et détail de tous les sites du parc |
| Groupes | Liste et détail de tous les groupes électrogènes |
| Relevés | Historique de tous les rapports saisis par les opérateurs |
| Comptes | Gestion des utilisateurs et de leurs rôles |
| Profil | Modification de vos informations et de votre mot de passe |

### Principales actions à votre disposition

* **Surveiller** les alertes en temps réel et les **traiter** (clôturer, escalader, commenter).
* **Analyser** la consommation et l'autonomie par site, par groupe, par période.
* **Importer / exporter** des relevés au format Excel ou CSV.
* **Créer, modifier, supprimer** des comptes utilisateurs et attribuer les rôles.
* **Administrer** le parc : voir les anomalies d'écart, corriger les rattachements.

---

## 2.2. Tableau de bord

### Comprendre les 4 indicateurs

La page *Tableau de bord* affiche, sous le bandeau d'accueil *« Hello Admin ! »*, **quatre cartes d'indicateurs** qui résument l'état du parc :

1. **Sites urgents** (en rouge) — Nombre de sites ayant au moins une **alerte critique** active. C'est l'indicateur à surveiller en priorité.
2. **Alertes** (en rouge) — Nombre total d'**alertes à traiter** sur l'ensemble du parc. Le bouton *Centre d'alertes →* vous emmène directement dans le module dédié.
3. **Consommation** (en vert si hausse, rouge si baisse) — Volume total consommé sur la **semaine N**, comparé à la semaine N-1. La flèche et le pourcentage indiquent l'évolution.
4. **Delta horaire** — Nombre total d'heures de fonctionnement des groupes sur la semaine N, comparé à N-1. Une baisse importante peut signaler des arrêts machines.

[📷 **Capture :** Tableau de bord Responsable avec les 4 cartes d'indicateurs — *à insérer ici*]

> 🔍 **Détail :** chaque carte contient un petit lien en bas (*Sites →*, *Centre d'alertes →*, etc.) qui ouvre la liste filtrée correspondante.

### Situations à traiter en priorité

Sous les indicateurs, le bloc **« Notifications d'alertes »** liste les alertes les plus récentes. Vous voyez pour chacune :

* Son **niveau** (badge couleur) : *Critique*, *Haute*, *Moyenne*, *Basse*.
* Son **type** (ex. *Consommation sans fonctionnement*, *Écart de consommation horaire*).
* Le **site** et le **groupe** concernés.
* La **consommation enregistrée** et les **heures de fonctionnement**.
* Un lien **« Ouvrir → »** qui mène au détail du groupe.

[📷 **Capture :** Liste des notifications d'alertes avec les badges de niveau — *à insérer ici*]

**Priorité d'action recommandée :**

1. Commencer par les alertes **Critiques** (badge rouge foncé).
2. Traiter les **Hautes** dans la journée.
3. Regrouper les **Moyennes** et **Basses** en fin de semaine.

### Évolution de la consommation et du fonctionnement

En bas du tableau de bord, des **graphiques d'évolution** (consommation et heures de fonctionnement) vous permettent de voir l'historique semaine par semaine et de détecter visuellement des tendances anormales. Pour modifier la plage affichée, utilisez le **sélecteur de période** en haut de page (par défaut la semaine en cours).

---

## 2.3. Sites

### Consulter les sites

Le module *Sites* affiche la liste de tous les sites du parc. Le bandeau bleu *« Sites — Pilotage carburant »* rappelle le contexte.

### Filtrer les sites

Trois filtres sont disponibles en haut du tableau :

* **Période — Début** / **Période — Fin** : restreint l'analyse à une plage de dates.
* **Site** : permet de n'afficher qu'un site précis.
* **Affichage** : *Vue d'ensemble* (par défaut) ou *Vue détaillée*.

Pour appliquer un filtre, modifiez le champ et la liste se met à jour automatiquement.

### Consulter le détail d'un site

Cliquez sur une **ligne de site** pour ouvrir sa fiche détaillée. Vous y trouverez :

* L'**identité** du site (nom, code, localisation).
* L'**état de la Cuve Principale** (CP) : stock, capacité, niveau en pourcentage.
* L'**état des Cuves Journalières** (CJ).
* La **liste des groupes** rattachés avec leur consommation, leur autonomie et leurs alertes.
* L'**historique des relevés** du site.

### Comprendre les informations et graphiques

Le tableau *« Tous les sites »* affiche les colonnes suivantes :

| Colonne | Signification |
|---------|---------------|
| **Site** | Nom et code interne du site |
| **Stock** | Volume total (en litres) actuellement en stock dans la CP |
| **Consommation** | Volume total consommé sur la période filtrée |
| **Évolution** | Tendance de la consommation par rapport à la période précédente |
| **Alertes** | Nombre d'alertes actives sur le site (badge rouge) |
| **Autonomie** | Estimation du temps restant avant panne sèche : *Confortable* (vert), *Indéterminée* (orange), *Sans fonctionnement* (gris) |

[📷 **Capture :** Liste des sites avec les colonnes Stock, Consommation, Alertes, Autonomie — *à insérer ici*]

---

## 2.4. Groupes

### Consulter les groupes

Le module *Groupes électrogènes* affiche la liste de **tous les groupes** du parc, sur le même principe que les sites. Les filtres disponibles sont :

* **Relevé — Début** / **Relevé — Fin**
* **Site**
* **Affichage** : *Vue d'ensemble* (par défaut) ou *Vue détaillée*

### Consulter le détail d'un groupe

Cliquez sur une ligne pour ouvrir la fiche d'un groupe. Vous y voyez :

* Son **identifiant** (ex. *G1-SDMO-830*), sa **puissance**, son **modèle**.
* Le **site** et la **CJ** auxquels il est rattaché.
* L'**historique des consommations** (graphique + tableau).
* Les **alertes** liées à ce groupe.
* L'**autonomie estimée** du groupe et de son site.

### Analyser la consommation et le fonctionnement

Le tableau *« Tous les groupes électrogènes »* affiche :

| Colonne | Signification |
|---------|---------------|
| **Groupe** | Identifiant technique du groupe |
| **Site** | Site de rattachement |
| **Alertes** | Nombre d'alertes actives (badge rouge) |
| **Consommation N** | Volume consommé sur la semaine N |
| **Référence** | Consommation de référence (attendue) |
| **Écart** | Différence en % entre la consommation réelle et la référence (vert si en dessous, rouge si au-dessus) |
| **Conso. moyenne** | Moyenne glissante de la consommation |
| **Fonctionnement** | Nombre d'heures de fonctionnement sur la période |
| **Autonomie** | Estimation du temps restant (badge couleur) |

[📷 **Capture :** Tableau des groupes avec les colonnes Écart, Conso. moyenne, Autonomie — *à insérer ici*]

### Consulter les alertes liées au groupe

Dans la fiche groupe, la section **Alertes** liste toutes les alertes qui concernent ce groupe, avec leur niveau de priorité et leur date de détection. Vous pouvez cliquer sur **« Ouvrir le groupe »** pour accéder au détail complet.

### Traiter une alerte depuis le détail du groupe

1. Dans la fiche groupe, identifiez l'alerte à traiter.
2. Cliquez sur le bouton **« Traiter »** à droite de l'alerte.
3. Une fenêtre s'ouvre : saisissez un **commentaire** et choisissez l'action (**Clôturer**, **Escalader**, **Marquer comme résolu**).
4. Validez. L'alerte passe alors dans l'**Historique**.

---

## 2.5. Alertes

### Consulter les alertes

Le module *Alertes* (accessible via le menu **Alertes** ou via le badge rouge du menu) est le **centre de traitement** de toutes les anomalies. Il est composé de deux onglets :

* **À traiter** (badge avec le nombre d'alertes actives)
* **Historique** (alertes déjà traitées)

[📷 **Capture :** Centre d'alertes avec les onglets À traiter / Historique et les filtres par niveau — *à insérer ici*]

### Comprendre les niveaux de priorité

Chaque alerte possède un **niveau** matérialisé par un badge :

| Niveau | Couleur | Signification | Délai d'action recommandé |
|--------|---------|---------------|----------------------------|
| **Critique** | Rouge foncé | Risque immédiat (panne sèche imminente, fraude avérée) | **Immédiat** |
| **Haute** | Orange | Anomalie sérieuse (consommation sans fonctionnement, écart élevé) | Sous 24 h |
| **Moyenne** | Jaune | Surveillance renforcée (écart significatif) | Sous la semaine |
| **Basse** | Vert | À titre informatif | Lors du prochain audit |

### Filtrer les alertes

Une barre de filtres est disponible juste sous l'en-tête. Elle vous permet de filtrer par **niveau** :

* **Toutes** (par défaut) — affiche toutes les alertes à traiter.
* **Critique** — uniquement les alertes rouges foncées.
* **Haute** — uniquement les alertes orange.
* **Moyenne** — uniquement les alertes jaunes.
* **Basse** — uniquement les alertes vertes.

### Analyser une alerte

Chaque alerte est présentée dans une **carte** contenant :

* Le **niveau** (badge)
* Le **type** (ex. *Consommation sans fonctionnement*, *Écart de consommation horaire*)
* La **description détaillée** (volume consommé, heures de fonctionnement, écart en %)
* Le **site** et le **groupe** concernés
* La **date de détection**
* Deux boutons d'action : **« Ouvrir le groupe »** (pour analyser) et **« Traiter »**

### Traiter une alerte

1. Cliquez sur **« Traiter »** sur la carte de l'alerte.
2. Une boîte de dialogue s'ouvre avec :
   * Un champ **Commentaire** (recommandé : indiquez la cause identifiée)
   * Un choix d'**action** : *Clôturer*, *Escalader*, *Marquer comme résolu*
3. Validez. L'alerte disparaît de l'onglet *À traiter* et apparaît dans l'**Historique**.

### Consulter l'historique

Cliquez sur l'onglet **Historique** pour voir toutes les alertes traitées. Chaque entrée conserve :

* Le **type** et le **niveau** d'origine
* La **date de détection** et la **date de traitement**
* Le **commentaire** saisi lors du traitement
* L'**utilisateur** qui a traité l'alerte

---

## 2.6. Relevés

### Consulter les relevés

Le module *Relevés* affiche l'**historique complet** de tous les rapports saisis par les opérateurs. Le bandeau bleu *« Historique — Consultez et téléchargez les relevés transmis »* rappelle la fonction de la page.

Un **filtre de période** est disponible en haut :

* **Toutes** (par défaut)
* **7 jours**, **30 jours**, **90 jours**
* **Période spécifique** (sélection libre)

[📷 **Capture :** Page Historique des relevés avec le tableau des rapports — *à insérer ici*]

### Vérifier les données transmises

Le tableau *Historique* affiche, pour chaque rapport :

| Colonne | Signification |
|---------|---------------|
| **Relevé** | Numéro et nom de fichier (ex. *releve_13-07-2026.xlsx*) |
| **Période couverte** | Plage de dates des relevés contenus dans le rapport |
| **Sites** | Nombre de sites couverts |
| **Groupes** | Nombre de groupes couverts |
| **Lignes** | Nombre de lignes de relevé dans le rapport |
| **Envoyé le** | Date et heure de transmission par l'opérateur |
| **Actions** | Boutons *Excel*, *CSV*, *Supprimer* (🗑) |

### Télécharger les relevés

Pour exporter un rapport :

1. Repérez la ligne du rapport qui vous intéresse.
2. Cliquez sur **Excel** pour télécharger au format `.xlsx`, ou sur **CSV** pour un export brut.
3. Le fichier est téléchargé immédiatement et peut être ouvert dans Excel, LibreOffice ou un éditeur de texte.

### Administrer les relevés selon les droits

Vous seul, en tant que Responsable, avez la possibilité de **supprimer un rapport** (bouton 🗑 rouge). Une confirmation est demandée. Cette action est irréversible : préférez-la en dernier recours (rapport erroné, doublon).

> ⚠️ **Attention :** la suppression d'un rapport efface également ses lignes de relevé et peut faire disparaître des alertes associées.

---

## 2.7. Utilisateurs

### Consulter les comptes

Le module *Comptes* (menu **Comptes** de la barre de navigation) est l'espace d'administration des utilisateurs. Il est composé de **deux onglets** :

* **Mon profil** — vos informations personnelles et votre mot de passe
* **Équipe & rôles** — la liste de tous les utilisateurs de la plateforme

[📷 **Capture :** Page Comptes avec les onglets Mon profil / Équipe & rôles — *à insérer ici*]

### Créer un utilisateur

1. Dans l'onglet **Équipe & rôles**, cliquez sur **« + Ajouter un utilisateur »** (en haut à droite).
2. Remplissez le formulaire :
   * **Identifiant** (unique, ex. `j.dupont`)
   * **Prénom** et **Nom**
   * **E-mail** (servira également à la récupération de mot de passe)
   * **Rôle** : *Responsable*, *Opérateur* ou *Utilisateur*
   * **Mot de passe initial** (l'utilisateur pourra le changer)
3. Cliquez sur **« Créer »**. Le compte apparaît immédiatement dans la liste.

### Modifier un utilisateur

1. Dans la liste, cliquez sur l'icône **✎ (crayon)** à droite de l'utilisateur.
2. Modifiez les champs souhaités.
3. Cliquez sur **« Enregistrer »**.

> 💡 Vous pouvez **réinitialiser le mot de passe** d'un utilisateur depuis cette même fiche (utile en cas d'oubli).

### Attribuer un rôle

Le rôle détermine **toutes les permissions** de l'utilisateur. Pour le modifier :

1. Ouvrez la fiche de l'utilisateur.
2. Dans le menu déroulant **Rôle**, choisissez :
   * **Responsable** : accès total (administrateur)
   * **Opérateur** : saisie et transmission des relevés
   * **Utilisateur** : consultation uniquement
3. Enregistrez.

> 🔒 **Bonne pratique :** ne donnez le rôle *Responsable* qu'aux personnes de confiance. Préférez *Opérateur* aux agents terrain et *Utilisateur* aux personnes qui ont uniquement besoin de consulter.

---

## 2.8. Profil

### Modifier ses informations

1. Allez dans **Comptes → Mon profil**.
2. Le bloc **« Informations »** vous permet de modifier votre **Prénom**, **Nom** et **E-mail**.
3. Cliquez sur **« Enregistrer le profil »**.

> L'**identifiant** n'est pas modifiable : il sert de clé d'authentification unique.

### Modifier son mot de passe

1. Toujours dans **Mon profil**, ouvrez le bloc **« Mot de passe »** (à droite).
2. Renseignez :
   * **Mot de passe actuel** (sécurité)
   * **Nouveau mot de passe** (6 caractères minimum)
   * **Confirmer le nouveau mot de passe**
3. Cliquez sur **« Changer le mot de passe »**.

> ✅ Vous restez connecté après le changement : inutile de vous reconnecter.

---

# 3. Guide de l'Opérateur

> **Vous êtes Opérateur (Agent terrain) ?** Votre rôle est de **saisir rigoureusement les relevés** et de **suivre l'état des sites** dont vous avez la charge. Ce guide ne reprend que ce dont vous avez réellement besoin.

## 3.1. Vue d'ensemble de votre espace

### Navigation

Votre barre de navigation est plus courte que celle du Responsable. Elle contient :

1. Le **logo CarburFlow** et la mention *« Espace opérateur »*.
2. Les **modules** accessibles :
   * **Accueil** (Poste de pilotage, par défaut)
   * **Sites** (`/agent/sites`)
   * **Relevés** (`/agent/reports`)
   * **Profil** (`/agent/profile`)
3. À droite, votre **nom** (ex. *Agent Terrain*), le badge **OPÉRATEUR**, le bouton **Déconnexion** et le bouton de thème.

[📷 **Capture :** Barre de navigation de l'Opérateur — *à insérer ici*]

### Modules accessibles

| Module | Ce que vous pouvez y faire |
|--------|----------------------------|
| Accueil (Poste de pilotage) | Voir l'état de vos sites, vos derniers relevés, envoyer un nouveau relevé |
| Sites | Consulter l'état des sites sous votre responsabilité |
| Relevés | Préparer, remplir, vérifier et transmettre un nouveau rapport |
| Profil | Modifier vos informations et votre mot de passe |

### Ce que vous pouvez faire — et ce que vous ne pouvez PAS faire

* ✅ Consulter les sites et leurs cuves.
* ✅ Préparer et transmettre un relevé (rapport).
* ❌ Voir le tableau de bord global du Responsable.
* ❌ Voir ou traiter les alertes (c'est le rôle du Responsable).
* ❌ Modifier les comptes utilisateurs.
* ❌ Supprimer un rapport (seul le Responsable peut le faire).

### La page d'accueil — « Poste de pilotage »

À l'ouverture, vous arrivez sur la page **« Bonjour Agent ! »** qui contient :

1. Le **bandeau bleu** avec un bouton **« Envoyer un relevé »** en haut à droite.
2. **Trois indicateurs** :
   * **Sites suivis** : nombre de sites sous votre responsabilité
   * **Relevés transmis** : nombre total de rapports que vous avez déjà envoyés
   * **Dernier relevé** : date de votre dernière transmission (ou *Aucun* si vous n'en avez pas encore fait)
3. La section **« Mes sites »** : liste des sites dont vous avez la charge, avec pour chacun le **pourcentage de remplissage de la cuve**, le **niveau en litres** (ex. *154 / 300 L*), l'**autonomie** et le **groupe principal** (ex. *G30-LIONROCK-27*). Le bouton **« Voir tous les sites »** vous mène au module Sites.
4. La section **« Derniers relevés »** : vos dernières transmissions. Le bouton **« Envoyer mon premier relevé »** (ou **« Voir tous les relevés »**) vous emmène vers le module Relevés.

[📷 **Capture :** Page d'accueil Opérateur avec les 3 indicateurs et la liste « Mes sites » — *à insérer ici*]

---

## 3.2. Relevés

C'est le module central de votre activité. Il suit un processus en **3 étapes** : préparer, remplir, transmettre.

### Préparer un relevé

1. Dans le menu, cliquez sur **Relevés** (ou sur le bouton **« Envoyer un relevé »** du bandeau bleu).
2. L'onglet actif est **« Ajouter un relevé »**. Vous voyez trois étapes numérotées.
3. **Étape 1 — Préparer le relevé** : cliquez sur le bouton **« Télécharger la fiche Excel »** pour obtenir un fichier pré-rempli avec vos sites et vos groupes. Vous pouvez aussi utiliser le **« Modèle CSV »** si vous préférez saisir dans un tableur.
4. Le fichier téléchargé contient, pour chaque site et chaque groupe, les colonnes à remplir.

[📷 **Capture :** Module Relevés — Étape 1 « Préparer le relevé » avec le bouton de téléchargement — *à insérer ici*]

### Remplir le fichier

Ouvrez le fichier Excel (ou CSV) téléchargé et renseignez, pour **chaque ligne** :

* **Niveau des cuves** (CP et CJ) : valeur en litres lue sur site.
* **Dépotage** : quantité de carburant ajoutée par le camion-citerne (laisser vide ou `0` si aucun dépotage).
* **Compteur horaire** : valeur du compteur horaire du groupe au moment du relevé.

> 💡 **Astuce :** ne modifiez pas les colonnes techniques (identifiants, noms de sites). Modifiez uniquement les **valeurs de mesure**.

[📷 **Capture :** Fichier Excel ouvert avec les colonnes Niveau des cuves, Dépotage, Compteur horaire — *à insérer ici*]

### Importer le relevé

1. Revenez dans le module **Relevés**.
2. Passez à l'**étape 3 — Déposer le fichier** : cliquez sur la zone de dépôt (ou glissez-déposez le fichier).
3. Le système **analyse immédiatement** votre fichier.

### Vérifier les données

Une fois le fichier déposé, le système affiche un **récapitulatif** :

* Nombre de lignes reconnues
* Période couverte
* Liste des éventuelles anomalies détectées (ligne vide, valeur aberrante, etc.)

Lisez attentivement ce récapitulatif avant de continuer.

### Corriger les erreurs

Si le système détecte des **erreurs** :

1. Les lignes en erreur sont surlignées en rouge avec un **message clair** (ex. *« Compteur horaire inférieur au précédent »*, *« Cuve principale vide »*).
2. Retournez dans votre fichier Excel.
3. Corrigez les valeurs signalées.
4. **Réimportez** le fichier (la zone de dépôt accepte un nouveau fichier).

> 🔁 Vous pouvez **importer le fichier autant de fois que nécessaire** : seul le dernier fichier valide est conservé en mémoire.

### Gérer la détection d'un nouveau site/groupe

Si votre fichier contient un **site ou un groupe qui n'existe pas encore** dans CarburFlow, le système vous le signale. Deux cas :

* **Site inconnu** : le rapport ne peut pas être transmis tant que le Responsable n'a pas créé le site. Contactez-le.
* **Groupe inconnu** sur un site connu : même règle, attendez la création par le Responsable.

> En attendant, **retirez la ligne concernée** du fichier pour pouvoir transmettre le reste du rapport.

### Transmettre le relevé

Une fois toutes les erreurs corrigées :

1. Cliquez sur le bouton **« Transmettre le relevé »** (en bas du récapapitulatif).
2. Une **confirmation** s'affiche : *« Relevé transmis avec succès »*.
3. Vous retrouvez votre rapport dans l'onglet **« Envois »** (à droite de l'écran).

[📷 **Capture :** Confirmation de transmission et onglet Envois listant le rapport — *à insérer ici*]

---

## 3.3. Sites

### Consulter les sites accessibles

Le module *Sites* (menu **Sites**) affiche **uniquement les sites sous votre responsabilité** (vous ne voyez pas les sites des autres agents).

Les filtres disponibles sont :

* **Site** : sélectionner un site précis
* **Niveau** : *Tous les niveaux*, *Critique*, *Faible*, *Normal*
* **Autonomie** : *Toutes les autonomies*, *Confortable*, *Indéterminée*, *Sans fonctionnement*

[📷 **Capture :** Page Sites de l'Opérateur avec les filtres Site / Niveau / Autonomie — *à insérer ici*]

### Consulter les niveaux des cuves

Pour chaque site, le tableau affiche :

* **Site** et **code interne** (ex. *AC AKWA NORD — CP028*)
* **Niveau** : barre de progression verte + pourcentage (ex. *51 %*) + volume (ex. *154 / 300 L*)
* **Autonomie** : badge *Confortable*, *Indéterminée* ou *Sans fonctionnement*
* **Groupe(s)** : identifiant(s) du ou des groupes rattachés

> 🔍 Cliquez sur une ligne pour voir le détail complet du site (cuves, groupes, historique).

### Consulter l'autonomie

L'**autonomie** est une **estimation** du temps restant avant que la cuve ne soit vide, en fonction de la consommation moyenne. Elle est symbolisée par un badge :

* 🟢 **Confortable** : plus de 48 h d'autonomie estimée
* 🟠 **Indéterminée** : consommation trop variable pour estimer
* ⚪ **Sans fonctionnement** : aucun groupe n'a fonctionné sur la période

### Consulter l'état du site

L'**état du site** dépend du niveau de la cuve principale :

* 🟢 **Normal** : niveau ≥ 40 %
* 🟠 **Faible** : niveau entre 20 % et 40 %
* 🔴 **Critique** : niveau < 20 %

> ⚠️ Si un site est marqué **Critique**, prévenez votre Responsable et préparez un dépotage si possible.

---

## 3.4. Profil

Le module *Profil* est identique à celui du Responsable. Il vous permet de :

1. **Modifier vos informations** (prénom, nom, e-mail) dans le bloc **« Informations »**.
2. **Changer votre mot de passe** dans le bloc **« Mot de passe »** :
   * Saisissez votre **mot de passe actuel**
   * Saisissez un **nouveau mot de passe** (6 caractères minimum)
   * **Confirmez** le nouveau mot de passe
   * Cliquez sur **« Changer le mot de passe »**

[📷 **Capture :** Page Profil de l'Opérateur — *à insérer ici*]

---

# 4. Guide de l'Utilisateur

> **Vous êtes Utilisateur (Consultation) ?** Votre rôle est purement **consultatif**. Vous visualisez l'état du parc et les sites qui vous concernent, sans rien pouvoir modifier.

## 4.1. Vue d'ensemble de votre espace

### Navigation

Votre barre de navigation est la plus courte. Elle contient :

1. Le **logo CarburFlow** et la mention *« Espace consultation »*.
2. Les **modules** accessibles :
   * **Accueil** (par défaut, *Espace consultation*)
   * **Sites** (`/user/sites`)
   * **Profil** (`/user/profile`)
3. À droite, votre **nom** (*Utilisateur Lecture*), le badge **CONSULTATION**, le bouton **Déconnexion** et le bouton de thème.

[📷 **Capture :** Barre de navigation de l'Utilisateur — *à insérer ici*]

### Ce que vous pouvez faire — et ce que vous ne pouvez PAS faire

* ✅ Consulter le tableau de bord simplifié (3 indicateurs)
* ✅ Consulter la liste des sites et le détail d'un site
* ✅ Modifier votre profil et votre mot de passe
* ❌ Voir les alertes détaillées
* ❌ Saisir ou importer un relevé
* ❌ Modifier un quelconque paramètre du parc

---

## 4.2. Tableau de bord

### Lire les indicateurs

Votre page d'accueil affiche **trois indicateurs** synthétiques :

1. **Sites suivis** — nombre de sites que vous pouvez consulter.
2. **Niveau normal** — nombre de cuves dont le niveau est supérieur à 40 % (état sain).
3. **À surveiller** — nombre de cuves dont le niveau est **faible** (entre 20 et 40 %) ou **critique** (sous 20 %). Ce chiffre est en rouge.

[📷 **Capture :** Tableau de bord Utilisateur avec les 3 indicateurs — *à insérer ici*]

### Identifier les sites nécessitant une attention

Sous les indicateurs, le bloc **« Sites à surveiller »** liste, par ordre de criticité, les sites dont la **cuve principale** est en état **faible** ou **critique**. Pour chaque site :

* **Nom** et **code** (ex. *MABANDA — CP024*)
* **Type de cuve** (ex. *Cuve principale*)
* **Pourcentage** et **volume** (ex. *0 % — 0 L / 400 L*)
* **Badge** *Critique* (rouge)
* Un **message** contextuel (ex. *« Réservoir principal très faible »*)

> 👉 Cliquez sur un site pour ouvrir son **détail** et voir les cuves, les groupes et l'historique.

---

## 4.3. Sites

### Consulter ses sites

Le module *Sites & Cuves Principales* affiche la liste des sites accessibles. Le bandeau bleu *« Consultez l'ensemble des cuves principales et l'état détaillé de vos sites »* rappelle l'objet de la page.

[📷 **Capture :** Page Sites Utilisateur avec la liste des sites et leur niveau — *à insérer ici*]

### Filtrer les sites

Deux filtres sont disponibles :

* **Site** : choisir un site précis (par défaut *Tous les sites (30)*)
* **Niveau** : *Tous les niveaux*, *Critique*, *Faible*, *Normal*

### Consulter le niveau des cuves

Le tableau *« Tous les sites »* affiche :

| Colonne | Signification |
|---------|---------------|
| **Site** | Nom et code (ex. *BEPANDA LYCEE — CP026*) |
| **Niveau** | Pourcentage + volume (ex. *100 % — 800 / 800 L*) |
| **État** | Badge *Normal* (vert), *Faible* (orange) ou *Critique* (rouge) |

### Consulter le détail d'un site

Cliquez sur une ligne pour ouvrir la fiche complète du site :

* **Identité** du site
* **Cuve(s) principale(s)** et journalière(s) avec leur état
* **Groupe(s)** électrogène(s) rattaché(s)
* **Historique** des niveaux (lecture seule)

> 🔍 Tout est en **lecture seule** : aucun bouton de modification n'apparaît.

---

## 4.4. Profil

### Modifier ses informations

1. Dans le menu, cliquez sur **Profil**.
2. Le bloc **« Informations »** vous permet de modifier votre **Prénom**, **Nom** et **E-mail**.
3. Cliquez sur **« Enregistrer le profil »**.

> L'**identifiant** n'est pas modifiable.

### Modifier son mot de passe

1. Dans la page **Profil**, ouvrez le bloc **« Mot de passe »** (à droite).
2. Renseignez :
   * **Mot de passe actuel**
   * **Nouveau mot de passe** (6 caractères minimum)
   * **Confirmer le nouveau mot de passe**
3. Cliquez sur **« Changer le mot de passe »**.

[📷 **Capture :** Page Profil de l'Utilisateur — *à insérer ici*]

---

# 5. Annexes

## 5.1. Comprendre les indicateurs

| Indicateur | Où le trouver | Signification | Lecture |
|------------|---------------|---------------|---------|
| **Sites urgents** | Tableau de bord Responsable | Nombre de sites avec au moins une alerte critique | Plus le chiffre est bas, mieux c'est |
| **Sites suivis** | Accueil Opérateur & Utilisateur | Nombre de sites sous votre responsabilité / accessibles | Informatif |
| **Niveau normal** | Tableau de bord Utilisateur | Nombre de cuves dont le niveau est ≥ 40 % | Indicateur de santé global |
| **À surveiller** | Tableau de bord Utilisateur | Cuves en état *Faible* ou *Critique* | Plus le chiffre est haut, plus il faut être vigilant |
| **Consommation** | Tableau de bord Responsable | Volume total consommé sur la semaine N (vs N-1) | La flèche verte/rouge montre l'évolution |
| **Delta horaire** | Tableau de bord Responsable | Heures totales de fonctionnement semaine N (vs N-1) | Une chute peut signaler un arrêt machine |
| **Autonomie** | Détail site / groupe | Estimation du temps restant avant panne sèche | *Confortable* (vert) / *Indéterminée* (orange) / *Sans fonctionnement* (gris) |
| **Stock** | Liste sites / groupes | Volume total actuellement en cuve (en litres) | Informatif |
| **Écart** | Liste groupes | Différence en % entre consommation réelle et référence | Vert si en dessous, rouge si au-dessus |

---

## 5.2. Signification des états et niveaux

### État d'un site (cuve principale)

| État | Plage de niveau | Couleur | Action recommandée |
|------|-----------------|---------|---------------------|
| **Normal** | ≥ 40 % | 🟢 Vert | Aucune action immédiate |
| **Faible** | 20 – 40 % | 🟠 Orange | Préparer un dépotage |
| **Critique** | < 20 % | 🔴 Rouge | Dépotage urgent à planifier |

### Autonomie

| État | Signification | Action |
|------|---------------|--------|
| **Confortable** (> 48 h) | Pas de risque de panne sèche à court terme | Continuer la surveillance normale |
| **Indéterminée** | Consommation trop variable, estimation impossible | Surveiller manuellement, prévoir un dépotage |
| **Sans fonctionnement** | Aucun groupe n'a tourné sur la période | Vérifier l'état des machines |

### Niveau de priorité d'une alerte

| Niveau | Signification | Délai d'action |
|--------|---------------|----------------|
| **Critique** | Panne sèche imminente ou fraude avérée | **Immédiat** |
| **Haute** | Anomalie sérieuse (consommation sans fonctionnement, gros écart) | Sous 24 h |
| **Moyenne** | Écart significatif à analyser | Sous la semaine |
| **Basse** | À titre informatif | Lors du prochain audit |

---

## 5.3. Glossaire métier

| Terme | Définition |
|-------|------------|
| **Site** | Unité d'organisation la plus haute. Représente un lieu géographique (ex. *Bepanda International*). |
| **Cuve Principale (CP)** | Réservoir de stockage massif où s'effectuent les dépotages. Identifiant *CPxxx*. |
| **Cuve Journalière (CJ)** | Réservoir tampon plus petit qui alimente directement les groupes. Identifiant *CJxxx*. |
| **Groupe Électrogène** | Machine qui consomme le carburant pour produire de l'électricité. Identifiant *Gxx-XXXX-xxx*. |
| **Dépotage** | Action de remplir une cuve par un camion-citerne. Valeur saisie dans le relevé (en litres). |
| **Compteur horaire** | Compteur d'heures de fonctionnement d'un groupe. La différence entre deux relevés donne le **delta horaire**. |
| **Rapport (relevé)** | Agrégation d'un ensemble de lignes de relevé couvrant une période (typiquement une semaine). |
| **Ligne de rapport** | Un relevé spécifique pour un équipement (CP, CJ, GE) à une date donnée. |
| **Consommation de référence** | Consommation théorique d'un groupe, calculée à partir de sa puissance et de ses heures de fonctionnement. |
| **Écart** | Différence en pourcentage entre la consommation réelle et la consommation de référence. Un écart élevé déclenche une alerte. |
| **Autonomie** | Estimation du temps restant avant que la cuve ne se vide, calculée à partir de la consommation moyenne. |
| **Alerte** | Signalement automatique d'une anomalie détectée par le moteur d'analyse de CarburFlow. |
| **Niveau de priorité** | Gravité d'une alerte : *Critique*, *Haute*, *Moyenne*, *Basse*. |
| **Acteur / Persona** | Profil d'utilisation de CarburFlow : *Responsable*, *Opérateur*, *Utilisateur*. |

---

## 5.4. Problèmes courants

### Je n'arrive pas à me connecter

1. Vérifiez que votre **identifiant** et votre **mot de passe** sont corrects (attention à la casse).
2. Si vous avez oublié votre mot de passe, contactez votre **Responsable** : il peut le réinitialiser depuis le module *Comptes → Équipe & rôles*.
3. Si le problème persiste, contactez le support (voir 5.5).

### Un site apparaît en « Indéterminée »

C'est un comportement normal : l'autonomie ne peut pas être calculée quand la consommation est trop variable. Surveillez manuellement le site et planifiez un dépotage par sécurité.

### Mon fichier de relevé est rejeté à l'import

Les causes les plus fréquentes :

* **Cellules vides** sur les colonnes *Niveau CP*, *Niveau CJ* ou *Compteur horaire* : remplissez toutes les cases.
* **Compteur horaire inférieur au précédent** : vérifiez que vous avez bien lu le compteur en entier.
* **Site ou groupe inconnu** : contactez votre Responsable pour qu'il crée la référence dans le référentiel.
* **Mauvais format de fichier** : utilisez le modèle Excel ou CSV téléchargé à l'étape 1, ne le renommez pas.

### Je ne vois pas un site dans ma liste

* Si vous êtes **Opérateur** : le site n'est probablement pas sous votre responsabilité. Demandez au Responsable de vous l'affecter.
* Si vous êtes **Utilisateur** : la liste est restreinte aux sites qui vous ont été attribués.

### Le thème clair / sombre ne s'applique pas partout

Le choix de thème est mémorisé dans votre navigateur (cookie local). Si vous basculez d'un navigateur à l'autre, le thème par défaut (clair) sera appliqué.

### Mes alertes ne s'affichent plus

Vérifiez que vous êtes bien sur l'onglet **« À traiter »** (et non *Historique*). Si l'onglet est vide, c'est que toutes vos alertes ont été traitées — félicitations !

---

## 5.5. Support

Pour toute question ou incident :

* **Contacter votre Responsable CarburFlow** : il est votre premier interlocuteur pour tout ce qui concerne les comptes, les droits et l'ajout de nouveaux sites / groupes.
* **Support technique** : `support@carburflow.local`
* **Documentation technique** (développeurs / administrateurs système) : voir le dossier `docs/` du projet CarburFlow, notamment :
  * `docs/api/openapi.yml` — spécification de l'API
  * `docs/architecture/README.md` — architecture technique
  * `docs/deployment/production.md` — guide de déploiement

> 💡 **Bon usage !** Ce manuel est mis à jour à chaque évolution de la plateforme. Pensez à vérifier régulièrement que vous disposez bien de la dernière version.
