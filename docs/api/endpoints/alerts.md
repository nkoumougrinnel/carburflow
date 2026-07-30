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

Types métier :

| Type | Priorité | Condition |
|------|----------|-----------|
| `autonomie_critique` | critique | autonomie &lt; 24 h |
| `conso_sans_horaire` | haute | conso &gt; 0 sans delta horaire |
| `ecart_conso` | moyenne | écart horaire &gt; 15 % |
| `autonomie_preventive` | basse | autonomie &lt; 72 h |

Commande de backfill : `python manage.py detect_alertes`
