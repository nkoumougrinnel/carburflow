# Alertes API

## Endpoints

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET` | `/api/v1/alertes/` | Liste des alertes persistées |
| `GET` | `/api/v1/alertes/traitements` | Alertes marquées traitées |
| `POST` | `/api/v1/alertes/traiter` | Marquer une alerte comme traitée (admin) |

## Détection

Les alertes sont calculées et enregistrées en base **au dépôt d’une fiche**
(import rapport / `import_data`). Le frontend lit uniquement l’API alertes
(ou le champ `alerts` de `/dashboard/overview`).

Types métier (grille figée des 5 typologies) :

| Type | Priorité | Condition |
|------|----------|-----------|
| `autonomie_critique` | critique | autonomie &lt; 24 h |
| `autonomie_preventive` | moyenne | autonomie &lt; 36 h |
| `conso_sans_fonctionnement` | haute | conso &gt; 0 sans fonctionnement (ex `conso_sans_horaire`) |
| `fonctionnement_sans_consommation` | haute | delta horaire &gt; 0 sans conso (ex `horaire_sans_conso`) |
| `ecart_conso` | moyenne | écart horaire &gt; 15 % vs rapport précédent |
| `compteur_incoherent` | haute | compteurs incohérents sur un même rapport |

Commande de backfill : `python manage.py detect_alertes`
