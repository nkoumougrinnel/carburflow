# CARBURFLOW

## Modèle Conceptuel de Données (MCD) - Version MVP

*Formalisme Merise — Gestion des groupes électrogènes et cuves de carburant*

**Version :** 1.0 (MVP)  
**Date :** 28 juillet 2026  
**Statut :** ✅ Validé et cohérent

---

## 1. Présentation

Ce document présente le Modèle Conceptuel de Données (MCD) de l'application **CarburFlow**, un système de suivi de la consommation de carburant des groupes électrogènes répartis sur plusieurs sites.

### 1.1 Périmètre fonctionnel (MVP)

- Gestion des utilisateurs avec 4 niveaux de rôle
- Gestion des sites, cuves principales, cuves journalières et groupes électrogènes
- Création de rapports de suivi avec lignes de détail
- Génération d'alertes (seuils, pannes, écarts)
- Notification des utilisateurs

### 1.2 Entités principales

| # | Entité | Description |
|---|--------|-------------|
| 1 | UTILISATEUR | Compte Django (auth) |
| 2 | PROFIL_UTILISATEUR | Profil applicatif avec rôle |
| 3 | SITE | Site géographique |
| 4 | CUVE_PRINCIPALE | Cuve de stockage principale |
| 5 | CUVE_JOURNALIERE | Cuve d'alimentation journalière |
| 6 | GROUPE_ELECTROGENE | Groupe électrogène |
| 7 | RAPPORT | Rapport de suivi périodique |
| 8 | LIGNE_RAPPORT | Ligne de détail d'un rapport |
| 9 | ALERTE | Alerte système ou terrain |
| 10 | NOTIFICATION | Notification utilisateur |

---

## 2. Légende des symboles

| Symbole | Signification |
|---------|---------------|
| **🔑** | Clé primaire / identifiant |
| **#** | Clé étrangère (attribut hérité) |
| **(0,1)** | Participation optionnelle, au plus une fois |
| **(1,1)** | Participation obligatoire, exactement une fois |
| **(0,N)** | Participation optionnelle, plusieurs fois possibles |
| **(1,N)** | Participation obligatoire, plusieurs fois possibles |
| **CASCADE** | Suppression en cascade |
| **PROTECT** | Suppression bloquée si référencé |
| **SET_NULL** | Mise à NULL lors de la suppression |

---

## 3. Schéma Entité-Association

### 3.1 Utilisateur et profil
```
+-----------------------------------+     (1,1)         +-----------------------------------+
|     UTILISATEUR (Django User)     | ────[POSSEDE]──── |     PROFIL_UTILISATEUR            |
|                                   |     (1,1)         |                                   |
|  🔑 id                           |                   |  🔑 id                           |
|  username (unique)               |                   |  role (super_admin/admin/agent/user) |
|  password                        |                   |  created_at                      |
|  is_staff                        |                   +-----------------------------------+
|  is_superuser                    |
+-----------------------------------+
```

---

### 3.2 Création des rapports
```
+-----------------------------------+     (0,N)         +-----------------------------------+
|     UTILISATEUR (Django User)     | ────[CREE]─────── |     RAPPORT                       |
|                                   |     (0,1)         |                                   |
|  🔑 id                           |                   |  🔑 id                           |
|  username                         |                   |  date_debut                      |
+-----------------------------------+                   |  date_fin                        |
                                                       |  date_creation                   |
                                                       |  # created_by_id (SET_NULL)      |
                                                       +-----------------------------------+
```

---

### 3.3 Chaîne Site → Cuve Principale → Cuve Journalière → Groupe Électrogène
```
+-----------------------------------+     (1,1)         +-----------------------------------+
|            SITE                   | ────[LOCALISE]──── |     CUVE_PRINCIPALE               |
|                                   |     (1,N)         |                                   |
|  🔑 id                           |                   |  🔑 id                           |
|  nom (unique)                    |                   |  identifiant (unique)            |
|  localisation                    |                   |  capacite                        |
|  statut                          |                   |  # site_id (NOT NULL, CASCADE)   |
+-----------------------------------+                   +-----------------------------------+
                                                               |
                                                               | (1,1)
                                                               | [ALIMENTE]
                                                               | (1,N)
                                                               |
+-----------------------------------+     (1,1)         +-----------------------------------+
|  GROUPE_ELECTROGENE               | ────[EQUIPE]───── |  CUVE_JOURNALIERE                 |
|                                   |     (1,1)         |                                   |
|  🔑 id                           |                   |  🔑 id                           |
|  identifiant (unique)            |                   |  identifiant (unique)            |
|  marque                          |                   |  capacite                        |
|  puissance                       |                   |  # cuve_principale_id (NOT NULL) |
+-----------------------------------+                   |  # groupe_electrogene_id (NOT NULL) |
                                                       +-----------------------------------+
```

---

### 3.4 Rapport et Lignes de rapport
```
+-----------------------------------+     (1,1)         +-----------------------------------+
|            RAPPORT                | ────[CONTIENT]──── |     LIGNE_RAPPORT                 |
|                                   |     (1,N)         |                                   |
|  🔑 id                           |                   |  🔑 id                           |
|  date_debut                      |                   |  # rapport_id (NOT NULL, CASCADE)|
|  date_fin                        |                   |  # cuve_principale_id (NOT NULL) |
|  date_creation                   |                   |  # cuve_journaliere_id (NOT NULL)|
|  # created_by_id (SET_NULL)      |                   |  # groupe_electrogene_id (NOT NULL)|
+-----------------------------------+                   |  quantite_gasoil_cuve_principale |
                                                       |  quantite_gasoil_cuve_journaliere|
                                                       |  compteur_horaire               |
                                                       |  depotage                       |
                                                       |  etat_fonctionnement            |
                                                       |  observations                   |
                                                       +-----------------------------------+
```
**Contraintes :**
- Les 3 clés étrangères (`cuve_principale_id`, `cuve_journaliere_id`, `groupe_electrogene_id`) sont en **PROTECT** : la suppression d'une cuve ou d'un groupe est bloquée si des lignes de rapport l'utilisent.

---

### 3.5 Alertes
```
+-----------------------------------+     (0,1)         +-----------------------------------+
|     LIGNE_RAPPORT                 | ────[DECLENCHE]─── |     ALERTE                        |
|                                   |     (0,N)         |                                   |
|  🔑 id                           |                   |  🔑 id                           |
|  # rapport_id                    |                   |  date_apparition                 |
+-----------------------------------+                   |  priorite                        |
                                                       |  type_alerte                    |
                                                       |  message (NOT NULL)             |
                                                       |  etat (nouvelle/en_cours/traitee/ignoree) |
                                                       |  date_traitement                |
                                                       |  # site_id (SET_NULL)           |
                                                       |  # cuve_journaliere_id (SET_NULL) |
                                                       |  # groupe_electrogene_id (SET_NULL) |
                                                       |  # ligne_rapport_id (SET_NULL)  |
                                                       |  # traite_par_id (SET_NULL)     |
                                                       +-----------------------------------+
```
**Références optionnelles :** Les associations ci-dessous sont toutes en **(0,N)-(0,1)** et **SET_NULL**.

---

### 3.6 Notifications
```
+-----------------------------------+     (0,N)         +-----------------------------------+
|     UTILISATEUR (Django User)     | ────[RECOIT]───── |     NOTIFICATION                  |
|                                   |     (1,1)         |                                   |
|  🔑 id                           |                   |  🔑 id                           |
|  username                         |                   |  # destinataire_id (NOT NULL)   |
+-----------------------------------+                   |  # alerte_id (SET_NULL)         |
                                                       |  canal (in_app/email/sms)       |
                                                       |  contenu (NOT NULL)             |
                                                       |  lu (False par défaut)          |
                                                       |  date_envoi                     |
                                                       |  date_lecture                   |
                                                       +-----------------------------------+
```

---

## 4. Dictionnaire des données

*(Only a subset shown – full dictionary is in the original document)*

### 4.1 PROFIL_UTILISATEUR
| Attribut | Type | Contrainte | Description |
|----------|------|------------|-------------|
| id | AutoField | PK | Identifiant technique |
| user_id | OneToOneField | FK, unique, NOT NULL, CASCADE | Référence vers l'utilisateur Django |
| role | CharField(20) | choix : super_admin/admin/agent/user | Rôle applicatif |
| created_at | DateTimeField | auto_now_add | Date de création |

*(similarly for SITE, CUVE_PRINCIPALE, CUVE_JOURNALIERE, GROUPE_ELECTROGENE, RAPPORT, LIGNE_RAPPORT, ALERTE, NOTIFICATION)*

---

## 5. Récapitulatif des associations et cardinalités
| Entité source | Association | Cardinalités | Entité cible | Règle de gestion |
|---------------|-------------|--------------|--------------|------------------|
| UTILISATEUR | POSSEDE | (1,1)-(1,1) | PROFIL_UTILISATEUR | Chaque utilisateur a exactement un profil |
| UTILISATEUR | CREE | (0,N)-(0,1) | RAPPORT | Un utilisateur crée 0 à N rapports |
| SITE | LOCALISE | (1,1)-(1,N) | CUVE_PRINCIPALE | Un site regroupe 1 à N cuves principales |
| CUVE_PRINCIPALE | ALIMENTE | (1,1)-(1,N) | CUVE_JOURNALIERE | Une cuve principale alimente 1 à N cuves journalières |
| CUVE_JOURNALIERE | EQUIPE | (1,1)-(1,1) | GROUPE_ELECTROGENE | Association bijective obligatoire |
| RAPPORT | CONTIENT | (1,1)-(1,N) | LIGNE_RAPPORT | Un rapport contient 1 à N lignes (CASCADE) |
| LIGNE_RAPPORT | DECLENCHE | (0,1)-(0,N) | ALERTE | Une ligne peut déclencher 0 à N alertes |
| ALERTE | CONCERNE | (0,N)-(0,1) | CUVE_JOURNALIERE | Référence optionnelle |
| ALERTE | CONCERNE | (0,N)-(0,1) | GROUPE_ELECTROGENE | Référence optionnelle |
| ALERTE | LOCALISEE | (0,N)-(0,1) | SITE | Référence optionnelle |
| UTILISATEUR | TRAITE | (0,N)-(0,1) | ALERTE | Un utilisateur traite 0 à N alertes |
| UTILISATEUR | RECOIT | (0,N)-(1,1) | NOTIFICATION | Une notification a exactement un destinataire |
| NOTIFICATION | ORIGINE | (0,N)-(0,1) | ALERTE | Une alerte peut générer 0 à N notifications |

---

## 6. Rôles utilisateur
| Rôle | Périmètre | Peut créer/modifier | Peut valider/administrer |
|------|-----------|-------------------|--------------------------|
| **Super admin** | Toute la plateforme | Tout | Gestion des comptes, rôles, sites, seuils |
| **Admin** | Périmètre assigné (tous sites ou sous-ensemble) | Sites, cuves, groupes, rapports | Validation des rapports, traitement des alertes, gestion des agents |
| **Agent** | Site(s) assigné(s) | Rapports, lignes de rapport | Aucun droit de validation ni administration |
| **Utilisateur** | Lecture seule | Aucun | Consultation des tableaux de bord et rapports |

---

## 7. Contraintes d'intégrité
| # | Contrainte | Justification |
|---|------------|---------------|
| 1 | LIGNE_RAPPORT.cuve_principale_id NOT NULL | Une ligne de rapport référence toujours une cuve principale |
| 2 | LIGNE_RAPPORT.cuve_journaliere_id NOT NULL | Une ligne de rapport référence toujours une cuve journalière |
| 3 | LIGNE_RAPPORT.groupe_electrogene_id NOT NULL | Une ligne de rapport référence toujours un groupe électrogène |
| 4 | CUVE_JOURNALIERE.groupe_electrogene_id NOT NULL | Une cuve journalière est toujours équipée d'un groupe |
| 5 | PROTECT sur les FK de LIGNE_RAPPORT | La suppression d'une cuve/groupe est bloquée si des relevés historiques existent |
| 6 | NOTIFICATION.destinataire_id NOT NULL | Une notification a toujours un destinataire |

---

## 8. Notes techniques
### 8.1 Implémentation Django
```python
# Exemple de code pour LIGNE_RAPPORT
class LigneRapport(models.Model):
    rapport = models.ForeignKey('Rapport', on_delete=models.CASCADE)
    cuve_principale = models.ForeignKey('CuvePrincipale', on_delete=models.PROTECT)
    cuve_journaliere = models.ForeignKey('CuveJournaliere', on_delete=models.PROTECT)
    groupe_electrogene = models.ForeignKey('GroupeElectrogene', on_delete=models.PROTECT)
    # ... autres champs
```

### 8.2 Index recommandés
- `LIGNE_RAPPORT.rapport_id`
- `LIGNE_RAPPORT.cuve_principale_id`
- `LIGNE_RAPPORT.cuve_journaliere_id`
- `LIGNE_RAPPORT.groupe_electrogene_id`
- `ALERTE.site_id`
- `ALERTE.etat`
- `NOTIFICATION.destinataire_id`
- `NOTIFICATION.lu`

---

## 9. Validations métier (hors MCD)
| # | Règle | Niveau |
|---|-------|--------|
| 1 | date_debut ≤ date_fin | Application |
| 2 | quantités ≥ 0 | Application |
| 3 | compteur_horaire ≥ 0 | Application |
| 4 | Une ligne de rapport ne peut être créée que pour une cuve/groupe existant | Base de données (FK) |
| 5 | Une alerte ne peut être traitée que par un admin ou un agent | Application |

---

## 10. Historique des versions
| Version | Date | Auteur | Modifications |
|---------|------|--------|---------------|
| 1.0 | 28/07/2026 | - | Version MVP final validée |

---

**✅ FIN DU DOCUMENT**
