# 📝 PROMPT DE GÉNÉRATION — Manuel Utilisateur CarburFlow (DOCX)

> **Objectif :** Générer un **document Microsoft Word (.docx)** complet, professionnel et prêt à distribuer au personnel, reprenant l'intégralité du manuel d'utilisation de CarburFlow (contenu, structure, captures d'écran insérables, mise en forme).

---

## ✅ PROMPT À COPIER-COLLER

```
Tu es un générateur de documents Word (.docx) professionnels. Produis un document unique, structuré, prêt à imprimer et à distribuer au personnel, en respectant STRICTEMENT toutes les consignes ci-dessous.

═══════════════════════════════════════════════════════════════════
1) IDENTITÉ DU DOCUMENT
═══════════════════════════════════════════════════════════════════
- Titre principal : « MANUEL D'UTILISATION — CARBURFLOW »
- Sous-titre : « Plateforme de gestion et de surveillance du carburant pour réseaux de sites distants »
- Version : 1.0 — Septembre 2026
- Mention en pied de page : « CarburFlow — Document confidentiel à usage interne »

═══════════════════════════════════════════════════════════════════
2) MISE EN PAGE (à appliquer au document Word)
═══════════════════════════════════════════════════════════════════
- Format A4, marges 2,5 cm haut/bas, 2 cm gauche/droite
- Police principale : « Calibri » 11 pt, interligne 1,15
- Police des titres : « Calibri Bold »
- Couleur principale : bleu marine (#0E3A5F)
- Couleur secondaire : orange doux (#E07A2C) pour les badges
- Numérotation automatique des titres (Heading 1, 2, 3)
- Table des matières automatique en début de document (après la page de garde)
- En-tête de page : « Manuel Utilisateur — CarburFlow v1.0 » à gauche, « [Chapitre en cours] » à droite
- Pied de page : « Page X / Y » centré
- Chaque chapitre majeur commence sur une **nouvelle page** (saut de page)
- Les captures d'écran doivent être insérées dans des **encadrés légendés** : « 📷 Capture : [description] »
- Quand une capture n'est pas encore insérée, laisse un encadré vide avec le texte suivant à l'intérieur : « [📷 INSÉRER ICI LA CAPTURE : description précise de l'image] »

═══════════════════════════════════════════════════════════════════
3) STRUCTURE OBLIGATOIRE DU DOCUMENT
═══════════════════════════════════════════════════════════════════
Le document doit contenir EXACTEMENT les 5 parties suivantes, dans cet ordre, avec cette numérotation :

============================================================
PARTIE 1 — PRÉSENTATION GÉNÉRALE
============================================================
1.1. Présentation de CarburFlow
1.2. Objectifs de la plateforme
1.3. Organisation des données : Site → Cuves → Groupes → Relevés
1.4. Les trois profils utilisateurs
1.5. Accès et connexion à la plateforme

============================================================
PARTIE 2 — GUIDE DU RESPONSABLE / ADMINISTRATEUR
============================================================
2.1. Vue d'ensemble de votre espace
   - Navigation
   - Modules accessibles
   - Principales actions
2.2. Tableau de bord
   - Comprendre les 4 indicateurs
   - Situations à traiter en priorité
   - Évolution de la consommation et du fonctionnement
2.3. Sites
   - Consulter les sites
   - Filtrer les sites
   - Consulter le détail d'un site
   - Comprendre les informations et graphiques
2.4. Groupes
   - Consulter les groupes
   - Consulter le détail d'un groupe
   - Analyser la consommation et le fonctionnement
   - Consulter les alertes liées au groupe
   - Traiter une alerte depuis le détail du groupe
2.5. Alertes
   - Consulter les alertes
   - Comprendre les niveaux de priorité
   - Filtrer les alertes
   - Analyser une alerte
   - Traiter une alerte
   - Consulter l'historique
2.6. Relevés
   - Consulter les relevés
   - Vérifier les données transmises
   - Télécharger les relevés
   - Administrer les relevés selon les droits
2.7. Utilisateurs
   - Consulter les comptes
   - Créer un utilisateur
   - Modifier un utilisateur
   - Attribuer un rôle
2.8. Profil
   - Modifier ses informations
   - Modifier son mot de passe

============================================================
PARTIE 3 — GUIDE DE L'OPÉRATEUR
============================================================
3.1. Vue d'ensemble de votre espace
3.2. Relevés
   - Préparer un relevé
   - Remplir le fichier
   - Importer le relevé
   - Vérifier les données
   - Corriger les erreurs
   - Gérer la détection d'un nouveau site/groupe
   - Transmettre le relevé
3.3. Sites
   - Consulter les sites accessibles
   - Consulter les niveaux des cuves
   - Consulter l'autonomie
   - Consulter l'état du site
3.4. Profil

============================================================
PARTIE 4 — GUIDE DE L'UTILISATEUR
============================================================
4.1. Vue d'ensemble de votre espace
4.2. Tableau de bord
   - Lire les indicateurs
   - Identifier les sites nécessitant une attention
4.3. Sites
   - Consulter ses sites
   - Filtrer les sites
   - Consulter le niveau des cuves
   - Consulter le détail d'un site
4.4. Profil
   - Modifier ses informations
   - Modifier son mot de passe

============================================================
PARTIE 5 — ANNEXES
============================================================
5.1. Comprendre les indicateurs
5.2. Signification des états et niveaux
5.3. Glossaire métier
5.4. Problèmes courants
5.5. Support

═══════════════════════════════════════════════════════════════════
4) CONTENU À INTÉGRER (reprendre fidèlement)
═══════════════════════════════════════════════════════════════════

--- PARTIE 1 ---

1.1. CarburFlow est une application web dédiée à la gestion et à la surveillance du carburant sur des réseaux de sites distants équipés de groupes électrogènes. Elle centralise les relevés terrain, calcule automatiquement les consommations et détecte les anomalies (fuites, fraudes, risques de panne sèche) afin d'aider les responsables à prendre les bonnes décisions au bon moment. L'application a été pensée pour trois usages complémentaires : Piloter le parc de cuves et de groupes à distance, Détecter automatiquement les situations anormales via un moteur d'alertes, Auditer les relevés saisis par les opérateurs terrain.

[📷 INSÉRER ICI LA CAPTURE : Page de connexion / page d'accueil publique]

1.2. Objectifs :
- Lutter contre la fraude et le gaspillage
- Garantir la continuité de service
- Fluidifier le cycle de relevés
- Fournir des indicateurs fiables

1.3. Hiérarchie des données :
Site → Cuve Principale (CP) → Cuve Journalière (CJ) → Groupe Électrogène.
- Site : unité d'organisation la plus haute (ex. Bepanda International). Un site = une Cuve Principale.
- Cuve Principale (CPxxx) : réservoir de stockage massif où s'effectuent les dépotages.
- Cuve Journalière (CJxxx) : réservoir tampon qui alimente les groupes.
- Groupe Électrogène (Gxx-XXXX-xxx) : la machine qui consomme le carburant.
- Relevés (Rapport / Lignes de rapport) : ce que l'opérateur saisit chaque semaine : niveaux, compteur horaire, dépotage.

[📷 INSÉRER ICI LA CAPTURE : Schéma de la pyramide Site → CP → CJ → Groupe]

1.4. Les trois profils utilisateurs (inclure un TABLEAU avec colonnes : Profil, Rôle technique, Objectif, Modules accessibles) :
- Responsable / Administrateur (ADMIN) : Tableau de bord, Alertes, Sites, Groupes, Relevés, Utilisateurs, Profil
- Opérateur (AGENT) : Accueil, Sites, Relevés, Profil
- Utilisateur (USER) : Accueil, Sites, Profil

Tableau "Ce que chaque profil peut faire — et ne pas faire" avec les actions : voir tableau de bord, voir/traiter alertes, importer/supprimer rapport, saisir un relevé, consulter sites, gérer comptes, modifier profil/mot de passe.

[📷 INSÉRER ICI LA CAPTURE : Trois bandeaux d'en-tête côte à côte (Responsable, Opérateur, Utilisateur)]

1.5. Connexion :
1. Ouvrir l'URL de CarburFlow
2. Saisir identifiant et mot de passe
3. Cliquer sur Se connecter
Redirection automatique vers la page d'accueil du profil.

[📷 INSÉRER ICI LA CAPTURE : Page de connexion CarburFlow]

--- PARTIE 2 (RESPONSABLE) ---

2.1. Barre de navigation supérieure contenant : Logo CarburFlow, modules (Tableau de bord, Alertes, Sites, Groupes, Relevés, Comptes), nom, badge de rôle, bouton Déconnexion, bouton thème.

Tableau "Modules accessibles" et "Principales actions".

[📷 INSÉRER ICI LA CAPTURE : Barre de navigation du Responsable]

2.2. Tableau de bord — 4 indicateurs :
1. Sites urgents (rouge) : nombre de sites avec alerte critique
2. Alertes (rouge) : nombre d'alertes à traiter, bouton "Centre d'alertes →"
3. Consommation (vert/rouge) : volume total semaine N vs N-1
4. Delta horaire : heures totales de fonctionnement

Bloc "Notifications d'alertes" avec niveau, type, site/groupe, consommation, heures, lien "Ouvrir →".

[📷 INSÉRER ICI LA CAPTURE : Tableau de bord Responsable avec les 4 cartes d'indicateurs]

[📷 INSÉRER ICI LA CAPTURE : Liste des notifications d'alertes avec les badges de niveau]

Graphiques d'évolution de la consommation et du fonctionnement en bas du tableau de bord.

2.3. Sites — Filtres (Période début/fin, Site, Affichage vue d'ensemble/détaillée). Détail d'un site : identité, CP (stock, capacité, niveau), CJ, groupes (consommation, autonomie, alertes), historique.

Tableau des colonnes : Site, Stock, Consommation, Évolution, Alertes, Autonomie.

[📷 INSÉRER ICI LA CAPTURE : Liste des sites avec colonnes Stock, Consommation, Alertes, Autonomie]

2.4. Groupes — Filtres (Relevé début/fin, Site, Affichage). Détail d'un groupe : identifiant, puissance, modèle, site, CJ, historique, alertes, autonomie.

Tableau des colonnes : Groupe, Site, Alertes, Consommation N, Référence, Écart, Conso. moyenne, Fonctionnement, Autonomie.

[📷 INSÉRER ICI LA CAPTURE : Tableau des groupes avec colonnes Écart, Conso. moyenne, Autonomie]

Traiter une alerte depuis le détail du groupe : 1) Identifier l'alerte, 2) Cliquer sur Traiter, 3) Saisir commentaire + action (Clôturer, Escalader, Marquer comme résolu), 4) Valider.

2.5. Alertes — 2 onglets : "À traiter" (badge avec nombre) et "Historique".

Niveaux (avec TABLEAU) :
- Critique (rouge foncé) : risque immédiat → Immédiat
- Haute (orange) : anomalie sérieuse → Sous 24h
- Moyenne (jaune) : écart significatif → Sous la semaine
- Basse (vert) : informatif → Prochain audit

Filtres par niveau : Toutes, Critique, Haute, Moyenne, Basse.

Analyser une alerte : niveau, type, description, site/groupe, date, boutons "Ouvrir le groupe" et "Traiter".

Traiter une alerte : 1) Cliquer Traiter, 2) Saisir commentaire + action, 3) Valider → passe dans Historique.

Historique : type, niveau, dates, commentaire, utilisateur.

[📷 INSÉRER ICI LA CAPTURE : Centre d'alertes avec onglets À traiter / Historique et filtres par niveau]

2.6. Relevés — Filtres (Toutes, 7 jours, 30 jours, 90 jours, Période spécifique).

Tableau des colonnes : Relevé, Période couverte, Sites, Groupes, Lignes, Envoyé le, Actions (Excel, CSV, Supprimer).

[📷 INSÉRER ICI LA CAPTURE : Page Historique des relevés avec le tableau des rapports]

ATTENTION : la suppression d'un rapport efface ses lignes et peut faire disparaître des alertes associées.

2.7. Utilisateurs — 2 onglets : "Mon profil" et "Équipe & rôles".

[📷 INSÉRER ICI LA CAPTURE : Page Comptes avec onglets Mon profil / Équipe & rôles]

Créer un utilisateur : 1) + Ajouter un utilisateur, 2) Remplir (Identifiant, Prénom, Nom, E-mail, Rôle, Mot de passe initial), 3) Créer.

Modifier un utilisateur : icône ✎, modifier, enregistrer. Possibilité de réinitialiser le mot de passe.

Attribuer un rôle (Responsable/Opérateur/Utilisateur) via menu déroulant. Bonne pratique : ne donner Responsable qu'aux personnes de confiance.

2.8. Profil — Modifier informations (Prénom, Nom, E-mail). L'identifiant n'est pas modifiable. Modifier mot de passe (actuel + nouveau + confirmer, 6 caractères minimum).

--- PARTIE 3 (OPÉRATEUR) ---

3.1. Barre de navigation plus courte : Accueil, Sites, Relevés, Profil. Badge OPÉRATEUR.

Tableau "Modules accessibles" et "Ce que vous pouvez faire — et ce que vous ne pouvez PAS faire".

[📷 INSÉRER ICI LA CAPTURE : Barre de navigation de l'Opérateur]

Accueil "Poste de pilotage" avec :
- Bandeau bleu + bouton "Envoyer un relevé"
- 3 indicateurs : Sites suivis, Relevés transmis, Dernier relevé
- Section "Mes sites" (pourcentage cuve, niveau en litres, autonomie, groupe principal)
- Section "Derniers relevés" + bouton "Envoyer mon premier relevé"

[📷 INSÉRER ICI LA CAPTURE : Page d'accueil Opérateur avec 3 indicateurs et liste "Mes sites"]

3.2. Relevés — Processus 3 étapes :
1) Préparer : Télécharger fiche Excel pré-remplie OU Modèle CSV
2) Remplir : Niveau des cuves, Dépotage, Compteur horaire (ne pas modifier les colonnes techniques)
3) Importer : zone de dépôt / drag & drop, analyse immédiate

[📷 INSÉRER ICI LA CAPTURE : Module Relevés — Étape 1 "Préparer le relevé" avec bouton téléchargement]

[📷 INSÉRER ICI LA CAPTURE : Fichier Excel ouvert avec colonnes Niveau des cuves, Dépotage, Compteur horaire]

Vérifier données : récapitulatif avec lignes reconnues, période, anomalies.
Corriger erreurs : lignes surlignées en rouge avec message (ex. "Compteur horaire inférieur au précédent"), réimporter.

Gérer nouveau site/groupe : site inconnu = contacter Responsable, groupe inconnu = attendre création. Retirer la ligne pour transmettre le reste.

Transmettre : bouton "Transmettre le relevé", confirmation, onglet "Envois" liste le rapport.

[📷 INSÉRER ICI LA CAPTURE : Confirmation de transmission et onglet Envois]

3.3. Sites — Filtres (Site, Niveau, Autonomie). Tableau : Site + code, Niveau (% + volume), Autonomie (badge), Groupe(s).

[📷 INSÉRER ICI LA CAPTURE : Page Sites de l'Opérateur avec filtres Site/Niveau/Autonomie]

Autonomie :
- 🟢 Confortable (>48h)
- 🟠 Indéterminée (consommation variable)
- ⚪ Sans fonctionnement

État du site selon CP :
- 🟢 Normal (≥40%)
- 🟠 Faible (20-40%)
- 🔴 Critique (<20%) → prévenir Responsable, préparer dépotage

3.4. Profil — identique Responsable (informations + mot de passe).

[📷 INSÉRER ICI LA CAPTURE : Page Profil de l'Opérateur]

--- PARTIE 4 (UTILISATEUR) ---

4.1. Barre de navigation la plus courte : Accueil, Sites, Profil. Badge CONSULTATION.

Tableau "Ce que vous pouvez faire — et ne pouvez PAS faire".

[📷 INSÉRER ICI LA CAPTURE : Barre de navigation de l'Utilisateur]

4.2. Tableau de bord simplifié — 3 indicateurs :
1. Sites suivis
2. Niveau normal (cuves ≥40%)
3. À surveiller (cuves Faibles ou Critiques, en rouge)

Bloc "Sites à surveiller" : nom, code, type cuve, %/volume, badge "Critique", message contextuel.

[📷 INSÉRER ICI LA CAPTURE : Tableau de bord Utilisateur avec 3 indicateurs]

4.3. Sites & Cuves Principales. Filtres (Site, Niveau). Tableau : Site + code, Niveau, État (badge).

[📷 INSÉRER ICI LA CAPTURE : Page Sites Utilisateur avec liste des sites et leur niveau]

Détail d'un site : identité, CP/CJ, groupes, historique (lecture seule).

4.4. Profil — Modifier informations (Prénom, Nom, E-mail). Mot de passe (actuel + nouveau + confirmer).

[📷 INSÉRER ICI LA CAPTURE : Page Profil de l'Utilisateur]

--- PARTIE 5 (ANNEXES) ---

5.1. TABLEAU "Comprendre les indicateurs" :
| Indicateur | Où le trouver | Signification | Lecture |
| Sites urgents | TdB Responsable | Nb sites alerte critique | Plus bas = mieux |
| Sites suivis | Accueil Opérateur/Utilisateur | Nb sites | Informatif |
| Niveau normal | TdB Utilisateur | Cuves ≥40% | Santé globale |
| À surveiller | TdB Utilisateur | Cuves Faibles/Critiques | Plus haut = vigilance |
| Consommation | TdB Responsable | Volume semaine N vs N-1 | Flèche couleur évolution |
| Delta horaire | TdB Responsable | Heures fonctionnement | Chute = arrêt machine |
| Autonomie | Détail site/groupe | Temps avant panne | Confortable/Indéterminée/Sans |
| Stock | Liste sites/groupes | Volume en cuve (L) | Informatif |
| Écart | Liste groupes | Réel vs référence (%) | Vert bas, rouge haut |

5.2. TABLEAU "État d'un site (CP)" :
- Normal (≥40%) 🟢
- Faible (20-40%) 🟠
- Critique (<20%) 🔴

TABLEAU "Autonomie" :
- Confortable (>48h) 🟢
- Indéterminée 🟠
- Sans fonctionnement ⚪

TABLEAU "Niveau alerte" :
- Critique → Immédiat
- Haute → 24h
- Moyenne → semaine
- Basse → prochain audit

5.3. GLOSSAIRE :
Site, Cuve Principale (CP), Cuve Journalière (CJ), Groupe Électrogène, Dépotage, Compteur horaire, Rapport (relevé), Ligne de rapport, Consommation de référence, Écart, Autonomie, Alerte, Niveau de priorité, Acteur/Persona.

5.4. PROBLÈMES COURANTS (questions/réponses) :
- Connexion impossible → vérifier identifiant/mdp, contacter Responsable pour reset
- Site "Indéterminée" → comportement normal, surveiller manuellement
- Fichier rejeté → cellules vides, compteur inférieur, site/groupe inconnu, mauvais format
- Site manquant dans la liste → contacter Responsable pour affectation
- Thème non appliqué partout → préférence navigateur (cookie)
- Alertes n'apparaissent plus → vérifier onglet "À traiter"

5.5. SUPPORT :
- Responsable CarburFlow (premier interlocuteur)
- Support technique : support@carburflow.local
- Documentation technique : dossier docs/ du projet

═══════════════════════════════════════════════════════════════════
5) RÈGLES DE RÉDACTION ET DE MISE EN FORME
═══════════════════════════════════════════════════════════════════
- Style : clair, professionnel, pédagogique, en français
- Phrases courtes et concrètes, à la 2ᵉ personne du pluriel (« vous »)
- Une action = un verbe à l'infinitif en début de phrase pour les procédures
- Mettre en GRAS les noms de boutons, menus et champs de formulaire (ex. : cliquer sur **Enregistrer**)
- Mettre en ITALIQUE les noms de fichiers et les identifiants techniques
- Pour chaque écran décrit, prévoir un encadré « 📷 INSÉRER ICI LA CAPTURE : … » indiquant précisément quelle image ajouter
- Numéroter les procédures étape par étape (1, 2, 3, …)
- Inclure des TABLEAUX pour toutes les listes à plus de 3 colonnes (indicateurs, niveaux, rôles, etc.)
- Ajouter une **PAGE DE GARDE** avec : titre, sous-titre, version, date, logo CarburFlow (centré)
- Ajouter une **TABLE DES MATIÈRES** automatique juste après la page de garde
- Le document doit être **autonome** : un nouveau collaborateur doit pouvoir l'utiliser sans formation orale

═══════════════════════════════════════════════════════════════════
6) LIVRAISON
═══════════════════════════════════════════════════════════════════
- Format : .docx (Microsoft Word 2016+)
- Nom du fichier : « Manuel_Utilisateur_CarburFlow_v1.0.docx »
- Document final : complet, sans troncature, prêt à être imprimé ou distribué
```

---

## 🚀 Comment utiliser ce prompt

1. **Copier** l'intégralité du bloc entre ``` (du premier au dernier accent grave).
2. **Coller** dans l'un de ces outils :
   - **Microsoft Copilot** (Word en ligne)
   - **ChatGPT** (mode « Créer un document Word »)
   - **Claude** (mode artifacts si supporté)
   - **Mistral / Gemini** avec un plugin de génération .docx
3. **Joindre** en complément les captures d'écran que vous avez déjà si l'outil le permet.
4. **Récupérer** le fichier `.docx` généré, puis remplacer chaque encadré `[📷 INSÉRER ICI LA CAPTURE : …]` par votre capture réelle.

---

## 📌 Bonus — Version courte pour relance

Si l'outil de génération n'accepte pas un prompt aussi long, utilisez cette version condensée (à compléter avec vos propres captures) :

```
Génère un document Word (.docx) intitulé « MANUEL D'UTILISATION — CARBURFLOW v1.0 » pour le personnel interne.

STRUCTURE OBLIGATOIRE :
1. PRÉSENTATION GÉNÉRALE (présentation, objectifs, organisation Site→CP→CJ→Groupe, 3 profils, connexion)
2. GUIDE RESPONSABLE/ADMIN (tableau de bord 4 indicateurs, sites, groupes, alertes 4 niveaux, relevés, comptes, profil)
3. GUIDE OPÉRATEUR (poste de pilotage, processus relevé en 3 étapes, sites, profil)
4. GUIDE UTILISATEUR (tableau de bord 3 indicateurs, sites, profil)
5. ANNEXES (indicateurs, états, glossaire, problèmes courants, support)

MISE EN PAGE :
- A4, marges 2,5/2 cm, Calibri 11pt, interligne 1,15
- Titres numérotés automatiquement
- Table des matières automatique
- Chaque chapitre sur nouvelle page
- Bleu marine #0E3A5F pour titres
- TABLEAUX pour toutes les listes >3 colonnes
- Encadrés « 📷 INSÉRER ICI LA CAPTURE : [description] » aux emplacements des screenshots
- Gras pour boutons, italique pour fichiers/identifiants
- Style : clair, concret, à la 2ᵉ personne du pluriel
- Page de garde + table des matières

DÉTAILLE chaque action (bouton à cliquer, champ à remplir, comportement attendu) et inclut pour chaque profil un tableau « peut faire / ne peut pas faire ».

LIVRE un fichier .docx prêt à imprimer et distribuer.
```

---

✅ **Vous avez maintenant deux prompts** (un complet, un condensé) pour générer le document Word à distribuer au personnel, en respectant **toute** la structure et **tous** les paramètres définis dans le manuel.
