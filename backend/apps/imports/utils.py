"""Utilitaires DB pour reset / import (séquences auto-increment)."""

from __future__ import annotations

from django.db import connection


def reset_autoincrement(tables: list[str]) -> list[str]:
    """
    Remet les compteurs d'ID à 1 pour les tables vidées.

    - SQLite : DELETE FROM sqlite_sequence
    - PostgreSQL : setval(..., 1, false) → prochain id = 1
    """
    if not tables:
        return []

    vendor = connection.vendor
    reset: list[str] = []

    with connection.cursor() as cursor:
        if vendor == 'sqlite':
            for table in tables:
                cursor.execute(
                    'DELETE FROM sqlite_sequence WHERE name = %s',
                    [table],
                )
                reset.append(table)
        elif vendor == 'postgresql':
            for table in tables:
                # Séquence Django classique : {table}_id_seq
                seq = f'{table}_id_seq'
                cursor.execute(
                    'SELECT setval(%s, 1, false)',
                    [seq],
                )
                reset.append(table)
        # MySQL / autres : non géré ici

    return reset
