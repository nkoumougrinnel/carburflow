# Plan de Déploiement : CarburFlow

**Auteur : NKOUMOU TJADE, Développeur Principal**
**Date : Aout 2024**
**Version : 1.0**

Ce document définit la stratégie et la procédure de déploiement de l'application CarburFlow (Lutte contre la fraude carburant) dans l'environnement interne de CAMTEL.

## 1. Objectif et Portée

### 1.1 Objectif
Mettre en production l'application CarburFlow pour :
- Suivre les cuves de carburant des sites distants.
- Détecter automatiquement les anomalies de consommation.
- Piloter les stocks et les consommations des sites distants de CAMTEL.

### 1.2 Périmètre fonctionnel
- Import sécurisé de rapports hebdomadaires (fichiers Excel/CSV).
- Visualisation des consommations et des niveaux de cuves.
- Moteur de détection d'anomalies (Variance horaire, Consom sans heures).
- Gestion des alertes et audit pour le Responsable Lutte contre la Fraude.
- Tableau de bord consolidé.

---

## 2. Architecture Technique

### 2.1 Infrastructure (Serveur Physique)

| Élément | Spécification | Justification |
|---------|---------------|---------------|
| Serveur | Physique dédié | Performance et contrôle total |
| OS | Ubuntu Server 22.04 LTS | Stabilité et support long terme |
| CPU | 2 vCPU minimum | Suffisant pour la charge utilisateur |
| RAM | 4 Go minimum | Supporte PostgreSQL, Django et React |
| Stockage | 40 Go SSD | 20 Go pour OS + application, 20 Go de marge |
| Réseau | Interne CAMTEL + VPN | Sécurité maximale (isolation Internet) |

### 2.2 Composants Logiciels

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Backend API | Django REST Framework | Python 3.12 |
| Frontend | React + Vite | Node 20 |
| Base de données | PostgreSQL | 16 |
| Conteneurisation | Docker + Docker Compose | v24+ |
| Serveur web | Nginx | 1.27 |

### 2.3 Schéma d'architecture

```text
┌─────────────────────────────────────────────────────────┐
│                 SERVEUR PHYSIQUE CAMTEL                 │
│                   Ubuntu Server 22.04 LTS               │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              DOCKER (3 conteneurs)               │   │
│  │                                                  │   │
│  │  ┌────────┐    ┌──────────┐    ┌─────────────┐   │   │
│  │  │   db   │◄──►│ backend  │◄──►│  frontend   │   │   │
│  │  │        │    │          │    │             │   │   │
│  │  │Postgres│    │ Django   │    │ React+Nginx │   │   │
│  │  │        │    │          │    │             │   │   │
│  │  └────────┘    └──────────┘    └─────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
                 http://carburflow.local
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   Superviseurs    Agents de saisie    Consultation
   (Validation)    (Import Excel)      (Lecture seule)
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    VPN CAMTEL pour
                    sites distants
```

---

## 3. Configuration Réseau et Accès

### 3.1 Accès à l'application
- **URL interne** : `http://carburflow.local`
- **Protocole** : HTTP (Réseau interne sécurisé, HTTPS non requis).
- **DNS interne** : Entrée `carburflow.local` à créer sur le DNS CAMTEL.
- **Accès distant** : Uniquement via VPN CAMTEL pour les sites distants.

### 3.2 Sécurité réseau
- Application strictement isolée du réseau Internet.
- Accès restreint via VPN CAMTEL.
- Pare-feu : Ports ouverts uniquement en interne (5174, 8001, 5432).

---

## 4. Gestion des Utilisateurs (RBAC)

### 4.1 Rôles et Permissions

| Rôle | Fonction | Actions autorisées |
|------|----------|-------------------|
| **Responsable Fraude** | Audit et Pilotage | Accès total : Dashboard, Audit, Alertes |
| **Opérateur** | Saisie des données | Import sécurisé, suivi des rapports |
| **Utilisateur** | Consultation | Lecture seule, visualisation des jauges |

### 4.2 Dimensionnement
- **Utilisateurs simultanés max** : 50.

---

## 5. Analyse du Stockage et Données

### 5.1 Dimensionnement du Stockage Local (Données Actives)
L'application accède aux données instantanément via le SSD du serveur.

| Élément | Taille Estimée | Utilisation |
|----------|----------------|--------------|
| Système & Docker | ~8 Go | OS Ubuntu Server + Images conteneurs |
| Données Actives | ~2 Go | Base PostgreSQL + Fichiers statiques |
| Logs & Cache | ~2 Go | Supervision et fichiers temporaires |
| Marge de sécurité | ~28 Go | Évolution future, mises à jour, logs |
| **Total Serveur** | **40 Go** | **Configuration confortable** |

### 5.2 Stockage Distant (Sauvegardes)
Les sauvegardes sont déportées pour ne pas encombrer le serveur principal et garantir la sécurité.

- **Emplacement** : Serveur de fichiers CAMTEL.
- **Volume** : $\approx 100\text{ Mo}$ par sauvegarde quotidienne.
- **Rétention** : 30 jours ($\approx 3\text{ Go}$ par mois).
- **Cycle** : Le serveur CarburFlow crée une copie temporaire $\rightarrow$ transfert vers serveur fichiers $\rightarrow$ suppression locale.

---

## 6. Stratégie de Sauvegarde

### 6.1 Politique de sauvegarde
- **Fréquence** : Quotidienne (automatisée).
- **Type** : Dump complet de la base PostgreSQL.
- **Emplacement Principal** : Serveur de fichiers CAMTEL.

### 6.2 Rétention
- Conservation des sauvegardes quotidiennes sur 30 jours.

---

## 7. Plan de Déploiement (Accéléré)

Le déploiement est prévu sur **1 à 2 jours maximum**.

### Phase 1 : Préparation et Installation (Jour 1)
| Étape | Action | Responsable |
|-------|--------|-------------|
| 1.1 | Préparation du serveur physique et installation d'Ubuntu Server 22.04 | IT CAMTEL |
| 1.2 | Installation de Docker & Docker Compose | Team Ultime |
| 1.3 | Configuration de l'entrée DNS `carburflow.local` | IT CAMTEL |
| 1.4 | Clonage du code source et configuration `.env` | Team Ultime |
| 1.5 | Lancement des conteneurs et migrations BD | Team Ultime |

### Phase 2 : Données, Tests et Mise en Production (Jour 1 ou 2)
| Étape | Action | Durée |
|-------|--------|-------|
| 2.1 | Importation des données historiques | 2h |
| 2.2 | Création des comptes utilisateurs | 1h |
| 2.3 | Tests de validation (Smoke Tests) | 2h |
| 2.4 | Configuration de la sauvegarde automatique vers serveur fichiers | 1h |
| 2.5 | Bascule officielle et mise à disposition | 30 min |

---

## 8. Tests de Validation

### 8.1 Tests fonctionnels
- **Authentification** : Connexion réussie selon les rôles.
- **Import** : Import d'un fichier test sans erreur.
- **Détection** : Vérification qu'une anomalie connue génère bien une alerte.
- **VPN** : Accessibilité de l'application depuis un site distant via VPN.

### 8.2 Tests de sauvegarde
- Exécution manuelle du backup et vérification du transfert vers le serveur de fichiers.
- Test de restauration sur un environnement de test.

---

## 9. Maintenance et Exploitation

### 9.1 Tâches automatisées
- Sauvegarde quotidienne et nettoyage des fichiers obsolètes (> 30 jours).
- Monitoring de l'état des conteneurs.

### 9.2 Tâches de supervision
- Vérification hebdomadaire des logs et de l'espace disque.
- Mise à jour trimestrielle des images de base.

---

## 10. Sécurité
- Application isolée du réseau Internet.
- Accès restreint via VPN CAMTEL.
- Mode `DEBUG=False` impératif en production.
- Secrets stockés uniquement dans le fichier `.env` (non commités).

---

## 11. Plan de Retour en Arrière (Rollback)
En cas d'échec critique :
1. Arrêt des services : `docker compose down`.
2. Restauration de la base de données depuis le serveur de fichiers.
3. Retour à la version Git stable précédente.
4. Relance des services.

---

## 12. Ressources et Contacts

### Ressources humaines
- **Déploiement** : Team Ultime (1-2 jours).
- **Infrastructure** : IT CAMTEL (Support DNS/VPN/Serveur).

### Contacts (Équipe Projet)
| Rôle | Contact |
|------|---------|
| Développement & Support | **Team Ultime** |
| Support Infrastructure | IT CAMTEL |

---

## ANNEXE : Commandes de gestion rapide

```bash
# Lancement
docker compose up -d

# Consultation des logs
docker compose logs -f

# Sauvegarde manuelle
docker compose exec db pg_dump -U carburflow carburflow > backup_$(date +%F).sql
```
