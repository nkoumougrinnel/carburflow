"""
Migre les données legacy `dashboard_*` vers les tables des nouvelles apps.

Usage:
  python manage.py migrate_dashboard_data
  python manage.py migrate_dashboard_data --dry-run
  python manage.py migrate_dashboard_data --flush-target

Règles :
- Chaque ancienne CuvePrincipale devient un Site (nom = ancien identifiant)
  + une CuvePrincipale au format CPxxx.
- Les lignes incomplètes (FK manquantes) sont ignorées.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import connection, transaction

from apps.reports.models import LigneRapport, Rapport
from apps.sites.models import CuveJournaliere, CuvePrincipale, GroupeElectrogene, Site


def table_exists(name: str) -> bool:
    tables = connection.introspection.table_names()
    return name in tables


def fetchall(sql: str, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        cols = [c[0] for c in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]


class Command(BaseCommand):
    help = 'Importe dashboard_* vers sites/reports (nouvelles tables).'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument(
            '--flush-target',
            action='store_true',
            help='Vide d’abord les tables cibles métier (rapports, cuves, sites).',
        )

    def handle(self, *args, **options):
        dry = options['dry_run']
        required = [
            'dashboard_cuveprincipale',
            'dashboard_groupeelectrogene',
            'dashboard_cuvejournaliere',
            'dashboard_rapport',
            'dashboard_lignerapport',
        ]
        missing = [t for t in required if not table_exists(t)]
        if missing:
            self.stderr.write(self.style.ERROR(f'Tables absentes: {", ".join(missing)}'))
            return

        old_cps = fetchall('SELECT * FROM dashboard_cuveprincipale ORDER BY id')
        old_groups = fetchall('SELECT * FROM dashboard_groupeelectrogene ORDER BY id')
        old_cjs = fetchall('SELECT * FROM dashboard_cuvejournaliere ORDER BY id')
        old_rapports = fetchall('SELECT * FROM dashboard_rapport ORDER BY id')
        old_lignes = fetchall('SELECT * FROM dashboard_lignerapport ORDER BY id')

        self.stdout.write(
            f'Source: {len(old_cps)} CP, {len(old_groups)} groupes, '
            f'{len(old_cjs)} CJ, {len(old_rapports)} rapports, {len(old_lignes)} lignes'
        )
        if dry:
            self.stdout.write(self.style.WARNING('Dry-run — aucune écriture.'))
            return

        with transaction.atomic():
            if options['flush_target']:
                LigneRapport.objects.all().delete()
                Rapport.objects.all().delete()
                CuveJournaliere.objects.all().delete()
                CuvePrincipale.objects.all().delete()
                GroupeElectrogene.objects.all().delete()
                Site.objects.all().delete()
                self.stdout.write('Tables cibles vidées.')

            cp_map = {}  # old_cp_id -> new CuvePrincipale
            for idx, row in enumerate(old_cps, start=1):
                site, _ = Site.objects.get_or_create(
                    nom=row['identifiant'],
                    defaults={'localisation': '', 'statut': Site.STATUT_ACTIF},
                )
                new_id = f'CP{idx:03d}'
                cp, _ = CuvePrincipale.objects.update_or_create(
                    identifiant=new_id,
                    defaults={'capacite': row['capacite'], 'site': site},
                )
                cp_map[row['id']] = cp
                self.stdout.write(f'  CP {row["identifiant"]} → Site={site.nom} / {new_id}')

            group_map = {}
            for row in old_groups:
                g, _ = GroupeElectrogene.objects.update_or_create(
                    identifiant=row['identifiant'],
                    defaults={
                        'marque': row.get('marque') or '',
                        'puissance': row.get('puissance') or '',
                    },
                )
                group_map[row['id']] = g

            cj_map = {}
            for row in old_cjs:
                cp = cp_map.get(row.get('cuve_principale_id'))
                groupe = group_map.get(row.get('groupe_electrogene_id'))
                if not cp or not groupe:
                    self.stdout.write(self.style.WARNING(
                        f'  CJ#{row["id"]} ignorée (CP/groupe manquant)'
                    ))
                    continue
                identifiant = (row.get('identifiant') or '').strip() or f'CJ-{row["id"]:04d}'
                cj, _ = CuveJournaliere.objects.update_or_create(
                    identifiant=identifiant,
                    defaults={
                        'capacite': row['capacite'],
                        'cuve_principale': cp,
                        'groupe_electrogene': groupe,
                    },
                )
                cj_map[row['id']] = cj

            rapport_map = {}
            for row in old_rapports:
                rapport = Rapport.objects.create(
                    date_debut=row['date_debut'],
                    date_fin=row['date_fin'],
                    created_by_id=row.get('created_by_id'),
                )
                rapport_map[row['id']] = rapport

            created_lignes = 0
            skipped = 0
            for row in old_lignes:
                rapport = rapport_map.get(row['rapport_id'])
                cp = cp_map.get(row.get('cuve_principale_id'))
                cj = cj_map.get(row.get('cuve_journaliere_id'))
                groupe = group_map.get(row.get('groupe_electrogene_id'))
                if not rapport or not cp or not cj or not groupe:
                    skipped += 1
                    continue
                LigneRapport.objects.create(
                    rapport=rapport,
                    cuve_principale=cp,
                    cuve_journaliere=cj,
                    groupe_electrogene=groupe,
                    quantite_gasoil_cuve_principale=row.get('quantite_gasoil_cuve_principale'),
                    quantite_gasoil_cuve_journaliere=row.get('quantite_gasoil_cuve_journaliere'),
                    compteur_horaire=row.get('compteur_horaire'),
                    depotage=row.get('depotage'),
                    etat_fonctionnement=row.get('etat_fonctionnement'),
                    observations=row.get('observations'),
                )
                created_lignes += 1

        self.stdout.write(self.style.SUCCESS(
            f'Terminé: {len(cp_map)} CP, {len(group_map)} groupes, '
            f'{len(cj_map)} CJ, {len(rapport_map)} rapports, '
            f'{created_lignes} lignes (ignorées: {skipped})'
        ))
