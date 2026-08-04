"""Analytics helpers for dashboard APIs."""

GROUPE_COLORS = [
    '#0b3d7a',
    '#3b82f6',
    '#60a5fa',
    '#1d4ed8',
    '#0ea5e9',
]


def _period_stats(values, start_idx, end_idx):
    values = list(values or [])
    if start_idx < 0 or end_idx >= len(values) or start_idx > end_idx:
        return {
            'weekN': None,
            'weekN1': None,
            'total': None,
            'mean': None,
        }

    period = values[start_idx:end_idx + 1]
    finite_values = [v for v in period if isinstance(v, (int, float))]
    if not finite_values:
        return {
            'weekN': None,
            'weekN1': None,
            'total': None,
            'mean': None,
        }

    week_n = finite_values[-1]
    week_n1 = finite_values[-2] if len(finite_values) > 1 else None
    total = sum(finite_values)
    mean = total / len(finite_values)

    return {
        'weekN': round(week_n, 1) if week_n is not None else None,
        'weekN1': round(week_n1, 1) if week_n1 is not None else None,
        'total': round(total, 1),
        'mean': round(mean, 1),
    }
