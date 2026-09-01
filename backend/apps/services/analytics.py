import statistics
from typing import List, Optional, Dict, Any

# Palette de couleurs professionnelles pour les graphiques (Nuances de bleu/azure)
GROUPE_COLORS = [
    '#0b3d7a', # Bleu foncé
    '#3b82f6', # Bleu royal
    '#60a5fa', # Bleu clair
    '#1d4ed8', # Bleu profond
    '#0ea5e9', # Cyan
    '#93c5fd', # Bleu pâle
    '#2563eb', # Bleu vif
    '#7dd3fc', # Bleu ciel
]

def _period_stats(values: List[Optional[float]], start_idx: int, end_idx: int) -> Dict[str, Any]:
    """
    Calcule les statistiques d'une série de valeurs sur une plage d'indices donnée.
    Ignore les valeurs None.
    """
    if not values:
        return {
            'mean': 0.0,
            'max': 0.0,
            'min': 0.0,
            'std': 0.0,
            'count': 0
        }

    # Extraction de la plage et nettoyage des None
    subset = values[start_idx : end_idx + 1]
    numeric = [float(v) for v in subset if v is not None]

    if not numeric:
        return {
            'mean': 0.0,
            'max': 0.0,
            'min': 0.0,
            'std': 0.0,
            'count': 0
        }

    return {
        'mean': round(statistics.fmean(numeric), 2),
        'max': round(max(numeric), 2),
        'min': round(min(numeric), 2),
        'std': round(statistics.stdev(numeric), 2) if len(numeric) > 1 else 0.0,
        'count': len(numeric),
    }
