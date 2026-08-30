# 📘 Guide Métier : Carburflow

Ce document a pour but d'expliquer la logique métier de l'application Carburflow. Il sert de référence pour les nouveaux arrivants afin de comprendre non seulement *comment* le code fonctionne, mais surtout *pourquoi* il est construit ainsi.

## 🌟 Présentation
Carburflow est une application de **gestion et de surveillance du carburant**. Elle est conçue pour des réseaux de sites distants (ex: antennes relais, centres de données) qui dépendent de groupes électrogènes.

L'objectif principal est de lutter contre le gaspillage et la fraude tout en garantissant la continuité de service (éviter la panne sèche).

---

## 🏗️ L'Écosystème (La Hiérarchie des Données)
L'application modélise la réalité physique du terrain selon une pyramide stricte. Il est crucial de respecter cet ordre pour toute modification du schéma de données ou de la logique API.

### 1. Le Site 📍
L'unité d'organisation la plus haute. Un site est un lieu géographique regroupant tout l'équipement.
*Exemple : "Site Douala - Centre Ville"*

### 2. La Cuve Principale (**CP**) 🛢️
Réservoirs de stockage massifs où s'effectuent les "dépotages" (remplissages par camion).
*Identifiant : Format `CPxxx` (ex: CP001)*

### 3. La Cuve Journalière (**CJ**) ⛽
Réservoirs tampons plus petits qui alimentent directement les machines.
*Identifiant : Format `CJxxx` (ex: CJ001)*
*Lien : Une CJ appartient toujours à une CP.*

### 4. Le Groupe Électrogène ⚡
La machine finale qui consomme le carburant.
*Lien : Un groupe est généralement associé à une CJ.*

**Flux logique :** `Site` $\rightarrow$ `Cuve Principale` $\rightarrow$ `Cuve Journalière` $\rightarrow$ `Groupe Électrogène`.

---

## 🔄 Processus Métier

### 📝 Le Cycle des Rapports
C'est le cœur de l'application. Le flux est le suivant :
1. **Saisie Terrain :** Un opérateur relève les niveaux (CP, CJ) et le compteur horaire du groupe.
2. **Rapport :** Ces relevés sont regroupés dans un **Rapport** couvrant une période donnée.
3. **Analyse :** Le système calcule la consommation réelle en comparant les niveaux entre deux relevés et en tenant compte des dépotages.

### ⚠️ La Détection d'Alertes
Le système analyse les données pour détecter des anomalies :
- **Fraude/Fuite :** Baisse de niveau anormale et brutale.
- **Risque de Panne :** Niveau critique atteint.
- **Incohérence :** Consommation non proportionnelle aux heures de fonctionnement du groupe.

---

## 👥 Personas et Rôles
L'accès aux fonctionnalités est strictement segmenté selon trois profils, chacun ayant son propre point d'entrée (vue par défaut) et un ensemble de pages autorisées :

### 🛡️ Le Responsable Lutte contre la Fraude (Admin)
C'est l'utilisateur "analyste" et administrateur. Son objectif est de détecter les anomalies et de superviser l'ensemble du parc.
- **Vue par défaut :** `Dashboard` (Tableau de bord).
- **Accès privilégiés :** 
    - `Dashboard` & `Alertes` : Surveillance en temps réel et analyse des anomalies.
    - `Cuves` & `Groupes` : Gestion et configuration technique des équipements.
    - `Rapports` : Audit des saisies terrain.
    - `Sites` : Vue globale du réseau.
- **Action :** Surveille les alertes, analyse les tendances de consommation et déclenche des audits.

### 👷 L'Opérateur (Agent)
C'est l'utilisateur "terrain". Son objectif est la saisie rigoureuse des données.
- **Vue par défaut :** `Espace Opérateur`.
- **Accès privilégiés :** 
    - `Rapports` : Saisie des relevés et consultation de l'historique.
    - `Sites` : Accès aux informations des sites dont il a la charge.
- **Action :** Effectue les relevés quotidiens (niveaux, compteurs) et les transmet via l'application.

### 👁️ L'Utilisateur (Viewer)
C'est l'utilisateur "consultant". Son objectif est le suivi simple.
- **Vue par défaut :** `Espace Utilisateur`.
- **Accès privilégiés :** 
    - `Sites` : Consultation des informations générales des sites.
    - `Profil` & `Notifications` : Gestion de son compte.
- **Action :** Visualise l'état général sans pouvoir modifier aucune donnée métier.

---

## 📖 Lexique Technique & Métier

| Terme | Signification | Note Technique |
| :--- | :--- | :--- |
| **CP** | Cuve Principale | `apps.equipment.CuvePrincipale` |
| **CJ** | Cuve Journalière | `apps.equipment.CuveJournaliere` |
| **Dépotage** | Remplissage d'une cuve par camion | Champ `depotage` dans `LigneRapport` |
| **Compteur Horaire** | Heures de fonctionnement du groupe | Champ `compteur_horaire` dans `LigneRapport` |
| **Rapport** | Agrégation de relevés sur une période | `apps.reports.Rapport` |
| **Ligne de Rapport** | Un relevé spécifique pour un équipement | `apps.reports.LigneRapport` |
