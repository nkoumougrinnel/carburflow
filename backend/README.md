# 🚀 CarburFlow Backend

Le backend de CarburFlow est une API REST construite avec **Django 5** et **Django REST Framework**, optimisée pour la lutte contre la fraude et le suivi des consommations de carburant.

## 🏗️ Architecture Technique

L'application suit une **Architecture en Couches (Layered Architecture)** pour garantir la séparation des responsabilités et faciliter la maintenance.

### 1. Couche Interface (API) $\rightarrow$ `apps/api/`
L'entrée unique du système. Elle ne contient aucune logique métier.
- **`urls.py`** : Le catalogue centralisé de tous les endpoints.
- **`views/`** : Des vues légères qui orchestrent les appels aux services et renvoient des réponses JSON.
- **`permissions.py`** : Gestion centralisée des accès (RBAC).

### 2. Couche Intelligence (Services) $\rightarrow$ `apps/services/`
Le "cerveau" de l'application. Toute la logique métier y est centralisée.
- **`calculs.py`** : Formules de consommation, distribution proportionnelle et autonomie.
- **`auth.py`** : Gestion des rôles, sécurité et payloads d'authentification.
- **`alerts.py`** : Moteur de détection des anomalies et des fraudes.
- **`imports.py`** : Logique de parsing et de validation des relevés CSV.

### 3. Couche Persistance (Modèles) $\rightarrow$ `apps/*/models.py`
Définition des données et contraintes d'intégrité.
- **`apps/sites`** : Gestion des sites techniques.
- **`apps/equipment`** : Hiérarchie technique (Cuve Principale $\rightarrow$ Cuve Journalière $\rightarrow$ Groupe).
- **`apps/reports`** : Stockage des rapports et lignes de relevés.
- **`apps/alerts`** : Persistance des alertes et suivi des traitements.

---

## 🛠️ Commandes de Gestion (Management)

L'application dispose de commandes puissantes pour l'administration des données :

- **Import de données** : `python manage.py import_data` (Importe le référentiel et les relevés depuis `data/imports/`).
- **Export de données** : `python manage.py export_data` (Exporte l'état actuel vers `data/exports/`).
- **Réinitialisation** : `python manage.py reset_and_import` (Nettoie la base et réimporte tout).
- **Seed** : `python manage.py seed_accounts` (Crée les comptes démo).

## 📦 Installation & Lancement

### Via Docker (Recommandé)
```bash
make docker-up
```

### Localement (Développement)
```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8001
```

## 🔒 Sécurité & Rôles
L'API utilise un système de rôles strict :
- **Super Admin** : Accès total, gestion du système.
- **Admin (Responsable Fraude)** : Accès aux dashboards, alertes et gestion des utilisateurs.
- **Agent (Opérateur)** : Saisie et transmission des rapports.
- **User (Viewer)** : Consultation simple des données de son site.
