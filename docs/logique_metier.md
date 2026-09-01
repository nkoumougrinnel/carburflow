# 📘 Cahier de Spécifications Métier - CarburFlow

## Version 1.0 - Septembre 2026

---

# Table des Matières

1. [Architecture des Données](#1-architecture-des-données)
2. [Calculs au Niveau du Site](#2-calculs-au-niveau-du-site)
3. [Distribution de la Consommation aux Groupes](#3-distribution-de-la-consommation-aux-groupes)
4. [Moteur d'Alertes et d'Anomalies](#4-moteur-dalertes-et-danomalies)
5. [Autonomie](#5-autonomie)
6. [Gestion des Périodes et Références](#6-gestion-des-périodes-et-références)
7. [Gestion des Données et Intégrité](#7-gestion-des-données-et-intégrité)
8. [Indicateurs de Performance](#8-indicateurs-de-performance)
9. [Graphiques et Visualisations](#9-graphiques-et-visualisations)
10. [Sécurité et Accès](#10-sécurité-et-accès)
11. [Spécifications UI/UX et Reformulation des Alertes](#11-spécifications-uiux-et-reformulation-des-alertes)
12. [Annexes](#12-annexes)

---

## 1. Architecture des Données

L'application repose sur une hiérarchie technique stricte pour garantir la traçabilité :

**Site → Cuve Principale (CP) → Cuve Journalière (CJ) → Groupe Électrogène (GE)**

### 1.1 Entités et Relations

| Entité | Description | Identifiant | Contraintes |
|--------|-------------|-------------|-------------|
| **Site** | Unité d'organisation la plus haute | Nom unique | Un site = une cuve principale |
| **Cuve Principale (CP)** | Réservoir de stockage massif | `CPxxx` | Une CP par site |
| **Cuve Journalière (CJ)** | Réservoir tampon alimentant un GE | `CJxxx` | Rattachée à une CP et un GE |
| **Groupe Électrogène (GE)** | Machine consommant le carburant | `Gxx-XXXX-xxx` | Alimenté par une CJ |

### 1.2 Flux Logique

```
Site
  ↓
Cuve Principale (CP)
  ↓
Cuve Journalière (CJ) ←──────────┐
  ↓                              │
Groupe Électrogène (GE) ─────────┘
(Consomme le carburant)
```

### 1.3 Règles de Rattachement

- Un **Site** possède **exactement une Cuve Principale**
- Un Site peut posséder **plusieurs Cuves Journalières**
- Chaque **Cuve Journalière** est rattachée à un **seul Groupe Électrogène**
- La puissance d'un groupe est **toujours considérée comme non nulle**

**Fichiers de référence :** `calculs.py` (fonctions `build_group_primary_site_ids`, `extraire_puissance`), `logique_metier.md`.

---

## 2. Calculs au Niveau du Site

### 2.1 Volume du Site (Stock CP)

Le volume d'un site est défini par le stock réel de sa Cuve Principale.

**Formule :**
$$\text{Volume}_{\text{site}} = \text{Quantité Gasoil Cuve Principale}$$

**Règles d'implémentation :**
- Si plusieurs lignes de relevés existent pour le site, prendre la **valeur maximale** (les lignes de différents groupes répètent le même volume CP)
- Si aucune valeur disponible → `0.0`

**Code de référence :**
```python
def _site_volume_from_lines(lines) -> float:
    cp_values = [
        float(l.quantite_gasoil_cuve_principale)
        for l in lines
        if l.quantite_gasoil_cuve_principale is not None
    ]
    return max(cp_values) if cp_values else 0.0
```
*Source : `calculs.py`*

### 2.2 Durée de Fonctionnement

La durée de fonctionnement d'un site est la somme des durées de fonctionnement de tous les groupes qui y sont rattachés.

**Formule :**
$$\text{DureeFonctionnement}_{\text{site}} = \sum(\text{Compteur}_{\text{GE } n} - \text{Compteur}_{\text{GE } n-1})$$

**Règles d'implémentation :**
- Ne comptabiliser que les deltas horaires **positifs**
- Les valeurs `None` sont ignorées

### 2.3 Consommation Réelle du Site

La consommation du site est calculée sur la base du **stock global** (CP + toutes les CJ) pour annuler l'effet des prélèvements internes (CP → CJ).

**Formule :**
$$\text{Conso}_{\text{site}} = (\text{Volume}_{\text{CP+CJ}, N-1}) - (\text{Volume}_{\text{CP+CJ}, N}) + \text{Dépotage}$$

**Où :**
- $\text{Volume}_{\text{CP+CJ}} = \text{Volume}_{\text{CP}} + \sum(\text{Volumes}_{\text{CJ}})$
- $\text{Dépotage}$ : Quantité de carburant ajoutée au site

**Cas Particuliers :**
- Le dépotage peut être **négatif** (en cas de prélèvement exceptionnel)
- Un dépotage négatif augmente mathématiquement la consommation calculée du site

**Code de référence :**
```python
def _consommation_periode(
    previous_cp: float,
    previous_cj: float,
    current_cp: float,
    current_cj: float,
    depotage: float,
) -> float:
    prev_total = float(previous_cp) + float(previous_cj)
    curr_total = float(current_cp) + float(current_cj)
    return prev_total - curr_total + float(depotage or 0.0)
```
*Source : `calculs.py`*

### 2.4 Dépotage

Le dépotage est une action unique sur la cuve principale. Toutes les lignes du site **doivent** avoir la même valeur de dépotage.

**Règle d'implémentation :**
- Prendre la **valeur maximale** des dépotages des lignes du site (pour éviter qu'une saisie erronée sur une ligne ne fausse le total)
- Si aucune valeur → `0.0`

**Code de référence :**
```python
def _site_depotage_from_lines(lines) -> float:
    values = [
        float(l.depotage or 0.0)
        for l in lines
        if l.depotage is not None and l.depotage != 0.0
    ]
    return max(values) if values else 0.0
```
*Source : `calculs.py` (version corrigée)*

---

## 3. Distribution de la Consommation aux Groupes

### 3.1 Principe Général

La consommation du site est distribuée aux groupes selon leur **puissance** et leur **activité** (delta horaire > 0).

### 3.2 Cas d'un Site à Groupe Unique

La consommation du groupe est égale à la consommation du site.

$$\text{Conso}_{\text{groupe}} = \text{Conso}_{\text{site}}$$

### 3.3 Cas d'un Site Multi-Groupes

La consommation est distribuée en combinant la part de la Cuve Principale (distribuée) et la variation propre de la Cuve Journalière.

#### A. Distribution de la Variation de la Cuve Principale (CP)

Seuls les groupes ayant fonctionné ($\text{DureeFonctionnement} > 0$) participent à la consommation de la CP, au prorata de leur puissance.

$$\text{PartCP}_{\text{groupe}} = \text{VariationCP}_{\text{site}} \times \frac{\text{Puissance}_{\text{groupe}}}{\sum(\text{Puissances des groupes actifs})}$$

#### B. Intégration de la Cuve Journalière (CJ)

On ajoute à la part de CP la variation brute de la cuve journalière du groupe.

$$\text{Conso}_{\text{groupe}} = \text{PartCP}_{\text{groupe}} + (\text{Volume}_{\text{CJ}, N} - \text{Volume}_{\text{CJ}, N-1})$$

**Note :** Si le résultat de la variation CJ est négatif, cela peut signifier un simple ravitaillement (CP → CJ) sans consommation réelle.

### 3.4 Cas Particulier : Absence de Fonctionnement

Si **tous** les deltas horaires des groupes d'un site sont nuls ($\Delta\text{Heures} = 0$ pour tous), la consommation du site n'est distribuée à **aucun groupe**.

### 3.5 Site Principal d'un Groupe

Pour déterminer le site principal d'un groupe, on utilise la hiérarchie suivante :

1. **Rattachement via Cuve Journalière** (priorité 1)
   - Si le groupe est rattaché à une CJ, le site est celui de la CP associée

2. **Rattachement via les Lignes de Rapport** (priorité 2)
   - Si le groupe n'a pas de CJ déclarée, on prend le site le plus fréquent dans ses lignes de rapport

**Code de référence :**
```python
def build_group_primary_site_ids(groups, lignes_all):
    primary_site_ids = {}
    
    # 1. Déduire du rattachement CJ
    for groupe in groups or []:
        cj = getattr(groupe, 'cuve_journaliere', None)
        cp_id = getattr(cj, 'cuve_principale_id', None)
        if cp_id is not None:
            primary_site_ids[groupe.id] = cp_id
    
    # 2. Compléter par les lignes de rapport
    counts_by_group_site = {}
    for line in lignes_all or []:
        gid = getattr(line, 'groupe_electrogene_id', None)
        if gid is None:
            continue
        site_ids = set()
        if getattr(line, 'cuve_principale_id', None) is not None:
            site_ids.add(line.cuve_principale_id)
        cj = getattr(line, 'cuve_journaliere', None)
        cp_id = getattr(cj, 'cuve_principale_id', None)
        if cp_id is not None:
            site_ids.add(cp_id)
        for sid in site_ids:
            counts = counts_by_group_site.setdefault(gid, {})
            counts[sid] = counts.get(sid, 0) + 1
    
    # 3. Pour les groupes sans CJ, prendre le site le plus fréquent
    for gid, counts in counts_by_group_site.items():
        if gid in primary_site_ids:
            continue
        if counts:
            primary_site_ids[gid] = max(counts.items(), key=lambda item: item[1])[0]
    
    return primary_site_ids
```
*Source : `calculs.py`*

**Fichiers de référence :** `calculs.py` (fonctions `calculer_groupes`, `build_group_primary_site_ids`).

---

## 4. Moteur d'Alertes et d'Anomalies

### 4.1 Calcul de la Consommation Horaire

Pour chaque rapport, on calcule le ratio :

$$\text{ConsoHoraire} = \frac{\text{Conso}_{\text{groupe}}}{\text{DureeFonctionnement}_{\text{groupe}}}$$

**Règles de validité :**
- Si $\text{ConsoHoraire} = 0$ (ex: $0\text{L} / 10\text{h}$) → la donnée est **non disponible**
- Si $\text{ConsoHoraire} = \infty$ (ex: $10\text{L} / 0\text{h}$) → la donnée est **non disponible**
- Les métriques (Moyenne, Max, Min, Écart-type) sont calculées **uniquement sur les valeurs finies et non nulles**

**Code de référence :**
```python
per_period_rates = []
for h, d in zip(hours_run, consumed_deltas):
    if h is not None and h > 0 and d is not None:
        rate = round(d / h, 2)
        if rate > 0:  # Exclut les 0 (considérés comme non disponibles)
            per_period_rates.append(rate)

mean_hourly_consumption_deduite = (
    sum(per_period_rates) / len(per_period_rates) if per_period_rates else 0.0
)
```
*Source : `calculs.py`*

### 4.2 Typologie des Alertes

L'application génère **5 types d'alertes** pour le suivi opérationnel du parc :

| # | Type | Niveau | Règle | Priorité | Description | Action | Exemple |
|---|------|--------|-------|----------|-------------|--------|---------|
| 1 | `consommation_sans_fonctionnement` | Groupe | conso > 0 et delta_h = 0 | 🔴 Haute | Baisse de stock inexpliquée | Vérifier le relevé / contrôler le groupe | 12,5 L sans heures |
| 2 | `fonctionnement_sans_consommation` | Groupe | delta_h > 0 et conso = 0 | 🟠 Haute | Activité sans consommation | Vérifier compteur / relevé | 18 h sans conso |
| 3 | `ecart_conso` | Groupe | écart horaire > 15% | 🟡 Moyenne | Dérive par rapport à l'historique | Analyser / valider | 28% d'écart |
| 4 | `autonomie_critique` | Groupe/Site | autonomie < 24h | 🔴 Critique | Risque de rupture | Action immédiate | 18 h restantes |
| 5 | `autonomie_preventive` | Groupe/Site | autonomie < 36h | 🟡 Moyenne | Risque prochain | Planifier réapprovisionnement | 32 h restantes |

**Fichiers de référence :** `logique_metier.md` (section 4.2), `AlertsPage.jsx`.

### 4.3 Détection d'Écart de Consommation Horaire

**Condition de déclenchement :**
$$|\text{ConsoHoraire}_{N} - \text{ConsoHoraire}_{N-1}| > 15\% \times \text{ConsoHoraire}_{N-1}$$

**Code de référence :**
```python
def should_emit_hourly_variance_alert(mean_hourly_consumption, observed_hourly_consumption, threshold_pct=15.0):
    mean_value = float(mean_hourly_consumption or 0.0)
    observed_value = float(observed_hourly_consumption or 0.0)
    if mean_value <= 0.0 or observed_value <= 0.0:
        return False
    ecart = abs((observed_value - mean_value) / mean_value) * 100
    return ecart > threshold_pct
```
*Source : `calculs.py`*

### 4.4 Détection des Situations "Sans Fonctionnement"

Un groupe est marqué "sans fonctionnement" si :

1. **Delta horaire = 0** sur la semaine N
2. **Consommation = 0** sur la semaine N
3. **Aucune activité historique** (pas de delta horaire > 0 ni de conso > 0 dans les périodes précédentes)

**Code de référence :**
```python
def should_mark_sans_fonctionnement(latest_hours_n, latest_cons_n, hours_run, consumed_deltas, is_infinite_consumption):
    if is_infinite_consumption:
        return False
    
    latest_hours = float(latest_hours_n) if latest_hours_n is not None else None
    latest_cons = float(latest_cons_n) if latest_cons_n is not None else None
    
    # 1. Delta horaire doit être = 0
    if latest_hours is None or latest_hours != 0.0:
        return False
    
    # 2. Consommation doit être = 0
    if latest_cons is None:
        latest_cons = 0.0
    if latest_cons > 0.0:
        return False
    
    # 3. Vérification de l'activité historique
    prior_pairs = []
    if len(hours_run) > 1:
        prior_pairs = list(zip(hours_run[:-1], consumed_deltas[:-1]))
    
    has_previous_activity = any(
        (h is not None and float(h) > 0.0) or (d is not None and float(d) > 0.0)
        for h, d in prior_pairs
    )
    return not has_previous_activity
```
*Source : `calculs.py`*

---

## 5. Autonomie

### 5.1 Autonomie du Groupe

L'autonomie est basée sur la **moyenne des consommations horaires finies et non nulles** sur **toutes les périodes disponibles** (pas seulement la dernière).

**Formule :**
$$\text{Autonomie}_{\text{groupe}} = \frac{(\text{Volume}_{\text{CP}} \times \text{RatioPuissance}) + \text{Volume}_{\text{CJ}}}{\text{ConsoHoraire}_{\text{moyenne}}}$$

**Où :**
- $\text{ConsoHoraire}_{\text{moyenne}}$ est la moyenne des ratios $\frac{\text{Conso}_{\text{groupe}}}{\text{DeltaH}_{\text{groupe}}}$ calculés sur l'ensemble des périodes où le groupe a fonctionné (delta horaire > 0 et consommation > 0).

**Cas Particuliers :**

| Condition | Résultat |
|-----------|----------|
| Aucune donnée de conso horaire positive | Autonomie indéterminée |
| Aucun fonctionnement historique | Autonomie indéterminée |
| Volume CP ou CJ indisponible | Autonomie indéterminée |

**Code de référence :**
```python
# Volume proportionnel
if latest_main_volume is not None:
    cj_part = float(latest_daily_volume or 0.0)
    volume_proportionnel = round(latest_main_volume * power_share + cj_part, 1)

# Autonomie
if mean_hourly_consumption_deduite > 0 and volume_proportionnel is not None:
    autonomy_hours = volume_proportionnel / mean_hourly_consumption_deduite
    formatted_autonomy = formater_autonomie(autonomy_hours)
else:
    is_infinite_autonomy = True
    autonomy_hours = None
    formatted_autonomy = "∞"
```
*Source : `calculs.py` (version corrigée)*

### 5.2 Autonomie du Site

L'autonomie d'un site est définie par le groupe **le plus critique**.

$$\text{Autonomie}_{\text{site}} = \min(\text{Autonomies des groupes rattachés})$$

**Règles :**
- Seuls les groupes avec une autonomie **chiffrée** (non indéterminée) sont pris en compte
- Si un groupe est "sans fonctionnement", il n'est pas pris en compte
- Si **tous** les groupes sont indéterminés ou sans fonctionnement, le site est marqué "indéterminé"

**Code de référence :**
```python
def resolve_site_autonomy_from_groups(site_groups):
    # 1. Filtrer les groupes valides (autonomie chiffrée)
    valid_hours = [
        g.get('autonomie_hours')
        for g in site_groups
        if g.get('autonomie_hours') is not None
        and not g.get('is_infinite_consumption')
        and not g.get('is_sans_fonctionnement')
        and not g.get('is_infinite_autonomy')
    ]
    
    # 2. Si au moins un groupe valide → prendre le minimum
    if valid_hours:
        aut_hours = round(min(valid_hours), 1)
        return {
            'autonomie_hours': aut_hours,
            'formatted_autonomy': formater_autonomie(aut_hours),
            'is_infinite_consumption': False,
            'is_infinite_autonomy': False,
            'is_sans_fonctionnement': False,
        }
    
    # 3. Cas particuliers
    if any(g.get('is_infinite_consumption') for g in site_groups):
        return {
            'autonomie_hours': None,
            'formatted_autonomy': None,
            'is_infinite_consumption': True,
            'is_infinite_autonomy': False,
            'is_sans_fonctionnement': False,
        }
    
    if any(g.get('is_sans_fonctionnement') or g.get('is_infinite_autonomy') for g in site_groups):
        return {
            'autonomie_hours': None,
            'formatted_autonomy': None,
            'is_infinite_consumption': False,
            'is_infinite_autonomy': True,
            'is_sans_fonctionnement': True,
        }
    
    # 4. Sinon → indéterminé
    return {
        'autonomie_hours': None,
        'formatted_autonomy': None,
        'is_infinite_consumption': False,
        'is_infinite_autonomy': True,
        'is_sans_fonctionnement': False,
    }
```
*Source : `calculs.py`*

### 5.3 Formatage de l'Autonomie

**Règles de formatage :**

| Condition | Format |
|-----------|--------|
| `heures = None` | `∞` |
| `heures = 0` | `0h` |
| `heures < 24h` | `17h54` |
| `heures ≥ 24h` | `2j17h` |

**Code de référence :**
```python
def formater_autonomie(heures):
    if heures is None:
        return "∞"
    if heures == 0:
        return "0h"
    t_mins = round(heures * 60)
    t_hrs = round(t_mins / 60)
    days = t_hrs // 24
    rem_h = t_hrs % 24
    return f"{days}j{rem_h}h" if days > 0 else f"{rem_h}h"
```
*Source : `calculs.py`*

**Fichiers de référence :** `calculs.py` (fonctions `formater_autonomie`, `resolve_site_autonomy_from_groups`), `GroupsPage.jsx`, `SitesPage.jsx`, `DashboardPage.jsx`.

---

## 6. Gestion des Périodes et Références

### 6.1 Définition des Périodes

L'application utilise un système de comparaison glissant pour identifier les dérives :

| Période | Définition |
|---------|------------|
| **Semaine N** | Période couverte par le rapport en cours de traitement |
| **Semaine N-1** | Période immédiatement précédente (référence chronologique) |
| **Période de la courbe** | Période définie par les filtres utilisateur (par défaut : 4 dernières semaines) |

### 6.2 Indicateurs de Comparaison (N vs N-1)

Pour chaque indicateur, l'écart est calculé pour mesurer la tendance :

**Écart de Consommation :**
$$\text{Écart}_{\text{conso}} = \frac{\text{Conso}_{N} - \text{Conso}_{N-1}}{\text{Conso}_{N-1}} \times 100$$

**Écart de Durée de Fonctionnement :**
$$\text{Écart}_{\text{durée}} = \frac{\text{DureeFonctionnement}_{N} - \text{DureeFonctionnement}_{N-1}}{\text{DureeFonctionnement}_{N-1}} \times 100$$

**Écart de Consommation Horaire :**
$$\text{Écart}_{\text{consoHoraire}} = \frac{\text{ConsoHoraire}_{N} - \text{ConsoHoraire}_{N-1}}{\text{ConsoHoraire}_{N-1}} \times 100$$

### 6.3 Règles de Comparaison

- Si la valeur de référence (N-1) est **nulle ou non disponible**, l'écart est **non calculable**
- Si l'écart est **positif** → tendance à la hausse (⚠️ attention)
- Si l'écart est **négatif** → tendance à la baisse (👍 favorable pour la consommation, 👎 défavorable pour l'autonomie)

**Fichiers de référence :** `DashboardPage.jsx` (fonctions `renderEcartVsN1`, `renderDeviation`).

---

## 7. Gestion des Données et Intégrité

### 7.1 Cas Particuliers

| Cas | Traitement | Exemple |
|-----|------------|---------|
| **Rapport manquant** | Recherche du dernier rapport numérique disponible pour éviter les faux zéros | Si une semaine sans relevé, les valeurs sont `null` |
| **Saisie erronée** | Les valeurs aberrantes sont signalées via les alertes de variance | Écart > 15% génère une alerte |
| **Dépotage négatif** | Augmente mathématiquement la consommation calculée du site | Prélèvement exceptionnel de 500L |
| **Données manquantes** | Créent des trous dans les courbes (`null`) | Pas de relevé sur la semaine |
| **Nouveaux équipements** | Création automatique lors de l'import du premier rapport | Nouveau site, nouvelle cuve, nouveau groupe |
| **Période de rodage** | Aucune alerte générée pour les premiers rapports | Les métriques n'ont pas d'historique |

### 7.2 Validité des Données

| Règle | Condition | Action |
|-------|-----------|--------|
| Date future | `date > today` | Rejet du relevé |
| Date trop ancienne | `date < today - 30 jours` | Alerte |
| Volume négatif | `volume < 0` | Rejet du relevé |
| Compteur en baisse | `compteur < compteur_prev` | Alerte (sauf remise à zéro) |

### 7.3 Taux de Disponibilité des Données

Le taux de disponibilité mesure la complétude des relevés :

$$\text{TauxDispo} = \frac{\text{Lignes complètes}}{\text{Lignes totales}} \times 100$$

**Ligne complète** = CP + CJ + Compteur horaire renseignés

**Fichiers de référence :** `ReportsPage.jsx` (processus d'import), `carburflow_fiche_hebdo_4.xlsx`.

---

## 8. Indicateurs de Performance

### 8.1 Indicateurs Clés (KPI)

| Indicateur | Définition | Formule | Unité |
|------------|------------|---------|-------|
| **Sites en autonomie critique** | Nombre de sites avec autonomie < 24h | `count(autonomie < 24h)` | Nombre |
| **Alertes actives** | Nombre d'alertes non traitées | `count(etat = 'active')` | Nombre |
| **Consommation totale** | Somme des consommations de tous les sites | `Σ(Conso_site)` | Litres |
| **Delta horaire total** | Somme des deltas horaires de tous les groupes | `Σ(DureeFonctionnement_groupe)` | Heures |
| **Taux de disponibilité** | Pourcentage de relevés complets | `(Lignes complètes / Lignes totales) × 100` | Pourcentage |

**Fichiers de référence :** `DashboardPage.jsx` (section `summaryCards`).

### 8.2 Statistiques de Base

**Moyenne :**
$$\text{Moyenne} = \frac{\sum x_i}{n}$$

**Écart-type :**
$$\sigma = \sqrt{\frac{\sum (x_i - \mu)^2}{n}}$$

**Code de référence :**
```python
def moyenne(values):
    nums = [v for v in values if v is not None]
    return sum(nums) / len(nums) if nums else 0.0

def ecart_type(values):
    nums = [v for v in values if v is not None]
    if not nums:
        return 0.0
    mean = moyenne(nums)
    variance = sum((v - mean) ** 2 for v in nums) / len(nums)
    return variance ** 0.5
```
*Source : `calculs.py`*

---

## 9. Graphiques et Visualisations

### 9.1 Courbe de Delta Horaire

**Question métier :** *"Combien le groupe a-t-il fonctionné ?"*

- **Axe X** : Dates de la période sélectionnée
- **Axe Y** : Heures de fonctionnement
- **Données** : Delta horaire par date

### 9.2 Courbe de Consommation

**Question métier :** *"Combien de carburant a-t-il consommé ?"*

- **Axe X** : Dates de la période sélectionnée
- **Axe Y** : Litres consommés
- **Données** : Consommation calculée par date

### 9.3 Courbe de Consommation Horaire

**Question métier :** *"Combien consomme-t-il lorsqu'il fonctionne ?"*

- **Axe X** : Dates de la période sélectionnée
- **Axe Y** : Litres par heure
- **Données** : Conso / Delta Horaire (si delta > 0)

**Points particuliers :**
- `∞` (conso sans heures) → marqueur ⚠️ en haut du graphique
- `0 L/h` (heures sans conso) → point à 0 sur la courbe

### 9.4 Règles d'Affichage

| Cas | Règle |
|-----|-------|
| Donnée manquante | `null` → trou dans la courbe |
| Donnée `∞` | Affichée comme valeur maximale avec symbole ∞ |
| Donnée `0` | Affichée normalement (0) |
| Période par défaut | 4 dernières semaines |

**Fichiers de référence :** `GroupsPage.jsx` (fonctions `buildHourlyRateSeries`, `buildHourlyConsumptionStats`), `SitesPage.jsx`.

---

## 10. Sécurité et Accès

### 10.1 Rôles et Permissions

| Rôle | Pages Accessibles | Actions |
|------|-------------------|---------|
| **Admin** | Dashboard, Alertes, Sites, Groupes, Relevés, Comptes, Profil, Messagerie | Lecture + Écriture (toutes) |
| **Opérateur** | Sites (détail), Relevés (import + historique), Profil, Messagerie | Lecture + Écriture (restreinte) |
| **Consultation** | Sites (lecture), Profil, Messagerie | Lecture uniquement |

### 10.2 Validation des Actions

| Action | Condition | Autorisation |
|--------|-----------|--------------|
| Marquer une alerte comme traitée | Rôle Admin | ✅ |
| Supprimer un rapport | Auteur ou Admin | ✅ |
| Importer un rapport | Rôle Admin ou Opérateur | ✅ |
| Modifier un profil | Utilisateur lui-même | ✅ |

**Fichiers de référence :** `ProfilePage.jsx`, `AlertsPage.jsx` (fonction `confirmTreat`).

---

Parfait, j'intègre ces précisions dans le cahier des spécifications.

---

## 11. Spécifications UI/UX – Présentation des Alertes

### 11.1 Principes de Présentation

Toute alerte est présentée selon une hiérarchie d'information cohérente :

1. **Badge de priorité** : indique le niveau d'urgence (CRITIQUE, HAUTE, MOYENNE, BASSE) — **sans emoji ni icône**, uniquement un badge coloré avec le libellé texte.
2. **Titre court** : synthèse de la situation (ex: "Autonomie inférieure à 24 h").
3. **Contexte** : site et/ou groupe concernés (ex: "Groupe G1-SDMO-830 · Bepanda International").
4. **Détail quantifié** : valeur mesurée (ex: "17,9 h restantes", "272 L/h vs 164 L/h").
5. **Actions** : lien vers la ressource ou bouton de traitement.

### 11.2 Layout du Dashboard – Aperçu Alertes

**Section : "À TRAITER EN PRIORITÉ"**

Affiche les 3 alertes les plus critiques. Chaque alerte est présentée en ligne :

```
[Badge Priorité]  Titre Alerte
Groupe/Site · Localisation
─────────────────────────────────────────────────────
```

**Champs affichés :**
- Badge : priorité (couleur + libellé texte).
- Ligne 1 : titre synthétique (ex: "Autonomie inférieure à 24 h").
- Ligne 2 : contexte (ex: "Groupe G1-SDMO-830 · Bepanda International").

**Tri et limitations :**
- Ordre : par priorité critique → haute → moyenne → basse.
- Affichage : max 3 alertes.
- Alertes clicables.
- CTA : "Voir les alertes →" en haut à droite pour accéder à la page complète.

**Fichiers de référence :** `DashboardPage.jsx` (section `previewAlerts`).

---

### 11.3 Layout du Centre d'Alertes – Page `/alertes`

#### 11.3.1 Alerte Active (non traitée)

```
┌───────────────────────────────────────────────────────┐
│ [Badge Priorité]              Date · Auteur Détection │
│                                                       │
│ Titre Alerte                                          │
│                                                       │
│ Sous-titre Détaillé avec chiffres et contexte…        │
│                                                       │
│ Site : Nom  |  Groupe : Label                       │
│                                                       │
│                 [ Ouvrir le site/groupe → ]           │
│                                        [ Marquer traitée ] │
└───────────────────────────────────────────────────────┘
```

**Champs affichés :**
- Badge priorité + date de détection + système auteur.
- Titre complet (ex: "Autonomie inférieure à 24 h").
- Sous-titre détaillé (ex: "17,9 h restantes · Stock actuel : 2 400 L").
- Bloc de contexte : "Site : [nom] | Groupe : [label]".
- Bouton "Ouvrir" : redirige vers la page détail du site/groupe.
- Bouton "Marquer traitée" : visible si l'utilisateur est admin.

#### 11.3.2 Alerte Traitée (Historique)

```
┌───────────────────────────────────────────────────────┐
│ [Badge Priorité]               [✓ TRAITÉE]            │
│ Détectée : Date Détection                             │
│                                                       │
│ Titre Alerte Complet                                  │
│                                                       │
│ Sous-titre Détaillé…                                  │
│                                                       │
│ Site : Nom | Groupe : Label                           │
│                                                       │
│ ┌─────────────────────────────────────────────────┐   │
│ │ Note de traitement                              │   │
│ │ Réapprovisionné 2500 L — autonomie ramenée      │   │
│ │ à 72 h.                                         │   │
│ └─────────────────────────────────────────────────┘   │
│                                                       │
│ Traité le 31/08/2026 à 15:20 · admin                  │
└───────────────────────────────────────────────────────┘
```

**Champs affichés :**
- Badge priorité + badge "[✓ TRAITÉE]".
- Date de détection.
- Titre et sous-titre (même que version active).
- Contexte : "Site : [nom] | Groupe : [label]".
- Bloc note de traitement (justification fournie par l'admin).
- Ligne de traitement : "Traité le [date] · [auteur]".

**Fichiers de référence :** `AlertsPage.jsx` (composants `AlertCard`, `TreatAlertModal`).

---

### 11.4 Layout des Pages Détail (Site / Groupe)

**Section : "ALERTES LIÉES"**

Affiche un historique compact des 5-10 dernières alertes associées au site ou groupe :

```
┌─────────────────────────────────────────────────────┐
│ ALERTES LIÉES                                       │
├─────────────────────────────────────────────────────┤
│ 31/08/2026 09:15   🟠 Écart de consommation  Voir → │
│ 24/08/2026 08:47   🟠 Écart de consommation  Voir → │
│ 17/08/2026 09:02   🟡 Écart de consommation  Voir → │
│ 31/08/2026 09:16   🔴 Autonomie < 24 h       Voir → │
└─────────────────────────────────────────────────────┘
```

**Champs affichés :**
- Date de détection.
- Badge de priorité (couleur uniquement, pas d'icône).
- Titre court de l'alerte.
- Lien "Voir →" : accès direct à l'alerte dans la page d'alertes.

**Tri et limitations :**
- Ordre : plus récent en premier.
- Affichage : max 10 alertes.
- Filtrage : alertes du groupe/site seulement.

**Fichiers de référence :** `GroupsPage.jsx` (section `relatedAlerts`), `SitesPage.jsx` (section `siteAttachedGroups`).

---

### 11.5 Correspondance des Champs Frontend / Backend

| Élément UI | Champ Backend | Origine |
|---|---|---|
| Badge priorité | `priorite` (critique, haute, moyenne, basse) | Alerte persisted DB |
| Titre court | `title` | Normalisation backend |
| Sous-titre détaillé | `subtitle` | Normalisation backend |
| Contexte Site | `site_id`, `site_name` | Alerte DB |
| Contexte Groupe | `group_id`, `group_label` | Alerte DB |
| Date détection | `detected_at` | Alerte DB |
| Date traitement | `date_traitement` | Traitement DB |
| Auteur traitement | `traite_par_username` | Traitement DB |
| Note traitement | `justification` | Traitement DB |

**Fichiers de référence :** `utils/alerts.js` (fonction `normalizePersistedAlert`).

---

### 11.6 Règles de Normalisation des Champs

**Titre (`title`) :**
- Format : `{Type d'alerte}` (court, sans contexte).
- Longueur max : 80 caractères.
- Exemples :
  - `"Autonomie inférieure à 24 h"`
  - `"Consommation sans fonctionnement"`
  - `"Écart de consommation"`

**Sous-titre (`subtitle`) :**
- Contient le détail quantifié et le contexte.
- Utilise des unités cohérentes (L, h, L/h, %).
- Peut inclure des flèches d'écart (▲, ▼) si pertinent.
- Exemples :
  - `"17,9 h restantes · Stock actuel : 2 400 L"`
  - `"272 L/h vs 164 L/h · Écart : +65,6 %"`
  - `"1 500 L sans delta horaire"`

**Contexte (`site_name`, `group_label`) :**
- Libellés simples, sans guillemets.
- Format : `"Groupe [label] · [Site]"` (ex: `"Groupe G1-SDMO-830 · Bepanda International"`).

**Fichiers de référence :** `utils/alerts.js` (fonction `splitAlertSubtitle`).

---

### 11.7 Couleurs des Badges de Priorité

| Priorité | Couleur (CSS) | Usage |
|----------|---------------|-------|
| **Critique** | 🔴 Rouge (`#dc2626`) | Autonomie < 24h |
| **Haute** | 🟠 Orange (`#f59e0b`) | Conso sans fonctionnement / Fonctionnement sans conso |
| **Moyenne** | 🟡 Jaune (`#ca8a04`) | Écart > 15% / Autonomie < 36h |
| **Basse** | ⚪ Gris (`#6b7280`) | Autonomie préventive (si utilisée) |

**Règle :** Aucun emoji ni icône n'est utilisé. Le badge est uniquement textuel avec une couleur de fond.

**Fichiers de référence :** `AlertsPage.jsx` (classes `alx-pill--critical`, `alx-pill--high`, `alx-pill--medium`, `alx-pill--low`).

---

### 11.8 Synthèse : Types d'Alertes en Production

| Type | Contexte | Priorité | Badge | Titre Standard |
|---|---|---|---|---|
| `autonomie_critique` | groupe/site | CRITIQUE | 🔴 Critique | "Autonomie inférieure à 24 h" |
| `conso_sans_fonctionnement` | groupe | HAUTE | 🟠 Haute | "Consommation sans fonctionnement" |
| `fonctionnement_sans_consommation` | groupe | HAUTE | 🟠 Haute | "Fonctionnement sans consommation" |
| `ecart_conso` | groupe | MOYENNE | 🟡 Moyenne | "Écart de consommation" |
| `autonomie_preventive` | groupe/site | MOYENNE | 🟡 Moyenne | "Autonomie inférieure à 36 h" |

**Fichiers de référence :** `logique_metier.md` (section 4.2), `utils/alerts.js` (fonction `resolvePrioriteKey`).

---

## 12. Annexes

### 12.1 Glossaire

| Terme | Définition |
|-------|------------|
| **CP** | Cuve Principale - réservoir de stockage massif |
| **CJ** | Cuve Journalière - réservoir tampon |
| **GE** | Groupe Électrogène - machine consommant le carburant |
| **Dépotage** | Remplissage d'une cuve par camion |
| **Delta Horaire** | Différence de compteur horaire entre deux relevés |
| **Autonomie** | Temps restant avant rupture de stock |
| **Semaine N** | Période du rapport en cours |
| **Semaine N-1** | Période précédente (référence) |

### 12.2 Liste des Alertes

| Type | Priorité | Description |
|------|----------|-------------|
| `consommation_sans_fonctionnement` | 🔴 Haute | Baisse de stock inexpliquée |
| `fonctionnement_sans_consommation` | 🟠 Haute | Activité sans consommation |
| `ecart_conso` | 🟡 Moyenne | Dérive par rapport à l'historique |
| `autonomie_critique` | 🔴 Critique | Risque de rupture (< 24h) |
| `autonomie_preventive` | 🟡 Moyenne | Risque prochain (< 36h) |

### 12.3 Récapitulatif des Formules

| Indicateur | Formule |
|------------|---------|
| **Volume site** | `max(CP)` |
| **Conso site** | `(CP+CJ)_prev - (CP+CJ)_curr + dépotage` |
| **Dépotage site** | `max(lignes.depotage)` |
| **Part CP groupe** | `VariationCP_site × (Puissance_groupe / Σ Puissances_actifs)` |
| **Conso groupe** | `PartCP_groupe + (CJ_N - CJ_N-1)` |
| **Conso horaire** | `Conso_groupe / DeltaH_groupe` |
| **Autonomie groupe** | `(CP × ratio + CJ) / ConsoHoraire_moyenne` |
| **Autonomie site** | `min(Autonomies_groupes)` |
| **Écart conso** | `(Conso_N - Conso_N-1) / Conso_N-1 × 100` |
| **Écart horaire** | `(Delta_N - Delta_N-1) / Delta_N-1 × 100` |

### 12.4 Fichiers de Référence

| Fichier | Contenu |
|---------|---------|
| `calculs.py` | Algorithmes métier (volume, conso, autonomie, distribution) |
| `logique_metier.md` | Spécifications métier originales |
| `DashboardPage.jsx` | Page Dashboard (KPI, tables, alertes) |
| `SitesPage.jsx` | Page Sites (vue liste, vue détail) |
| `GroupsPage.jsx` | Page Groupes (vue liste, vue détail, graphiques) |
| `AlertsPage.jsx` | Page Alertes (filtres, cartes, traitement) |
| `ReportsPage.jsx` | Page Relevés (import, historique) |
| `ProfilePage.jsx` | Page Profil (compte, sécurité, équipe) |
| `HomePage.jsx` | Page d'accueil (landing) |
| `carburflow_fiche_hebdo_4.xlsx` | Modèle de relevé Excel |

---

**Fin du Cahier de Spécifications Métier - Version 1.0**