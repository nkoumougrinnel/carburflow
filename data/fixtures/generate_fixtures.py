from pathlib import Path
import csv

root = Path(__file__).resolve().parent
data_dir = root / 'data'
fixtures_dir = data_dir / 'fixtures'
fixtures_dir.mkdir(parents=True, exist_ok=True)


def read_csv_rows(path: Path, delimiter=','):
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle, delimiter=delimiter))


# 1) Read legacy reference data
cp_capacity = {}
for row in read_csv_rows(data_dir / 'cuve_principale.csv'):
    name = (row.get('id_cuve_principale') or '').strip()
    if name:
        cp_capacity[name] = (row.get('capcite') or '0').strip()

cj_capacity = {}
for row in read_csv_rows(data_dir / 'cuve_journaliere.csv'):
    name = (row.get('id_cuve_principale') or '').strip()
    if name:
        cj_capacity[name] = (row.get('capacite') or '0').strip()

groupe_rows = read_csv_rows(data_dir / 'groupe_electrogene.csv', delimiter=';')


# 2) Parse report files and keep sites in the order from report 1
report_rows = []
for report_name in ['rapport_1_carburflow.csv', 'rapport_2_carburflow.csv', 'rapport_3_carburflow.csv']:
    with (data_dir / report_name).open('r', encoding='utf-8-sig', newline='') as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith('#'):
                continue
            if line.lower().startswith('id_cuve_journaliere') or 'colonnes' in line.lower():
                continue
            parts = next(csv.reader([line]))
            if len(parts) < 9:
                continue
            report_rows.append({
                'report_name': report_name,
                'id_cuve_journaliere': parts[0].strip(),
                'site': parts[1].strip(),
                'id_groupe': parts[2].strip(),
                'quantite_cuve_principale': parts[3].strip(),
                'quantite_cuve_journaliere': parts[4].strip(),
                'depotage': parts[5].strip(),
                'compteur_horaire': parts[6].strip(),
                'etat_fonctionnement': parts[7].strip(),
                'observations': parts[8].strip() if len(parts) > 8 else '',
            })

# Keep sites in historical order from report 1
sites = []
for row in report_rows:
    if row['site'] not in sites:
        sites.append(row['site'])


def normalize_groupe_id(old_id: str) -> str:
    old_id = (old_id or '').strip()
    if not old_id:
        return 'g1-sdmo-830'
    parts = old_id.split('-')
    if len(parts) >= 3:
        num = parts[0].lstrip('Gg')
        marque = parts[1].replace(' ', '').lower()
        puissance = parts[2].replace(' ', '').lower()
        return f'g{num}-{marque}-{puissance}'
    return old_id.lower().replace(' ', '')


# 3) Create users.csv
with (fixtures_dir / 'users.csv').open('w', encoding='utf-8', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=['username', 'password', 'email', 'role', 'is_staff', 'is_superuser', 'is_active'])
    writer.writeheader()
    writer.writerows([
        {'username': 'admin1', 'password': 'admin123', 'email': 'admin1@carburflow.com', 'role': 'admin', 'is_staff': 'True', 'is_superuser': 'True', 'is_active': 'True'},
        {'username': 'admin2', 'password': 'admin456', 'email': 'admin2@carburflow.com', 'role': 'admin', 'is_staff': 'True', 'is_superuser': 'False', 'is_active': 'True'},
        {'username': 'agent1', 'password': 'agent123', 'email': 'agent1@carburflow.com', 'role': 'agent', 'is_staff': 'False', 'is_superuser': 'False', 'is_active': 'True'},
        {'username': 'agent2', 'password': 'agent456', 'email': 'agent2@carburflow.com', 'role': 'agent', 'is_staff': 'False', 'is_superuser': 'False', 'is_active': 'True'},
        {'username': 'user1', 'password': 'user123', 'email': 'user1@carburflow.com', 'role': 'user', 'is_staff': 'False', 'is_superuser': 'False', 'is_active': 'True'},
        {'username': 'user2', 'password': 'user456', 'email': 'user2@carburflow.com', 'role': 'user', 'is_staff': 'False', 'is_superuser': 'False', 'is_active': 'True'},
    ])

# 4) Create site.csv
with (fixtures_dir / 'site.csv').open('w', encoding='utf-8', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=['nom_site', 'localisation', 'statut'])
    writer.writeheader()
    for site in sites:
        writer.writerow({'nom_site': site, 'localisation': 'Douala', 'statut': 'actif'})

# 5) Create cuve_principale.csv
with (fixtures_dir / 'cuve_principale.csv').open('w', encoding='utf-8', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=['id_cuve_principale', 'id_site', 'capcite'])
    writer.writeheader()
    for idx, site in enumerate(sites, 1):
        writer.writerow({
            'id_cuve_principale': f'cp{idx:03d}',
            'id_site': site,
            'capcite': cp_capacity.get(site, '0'),
        })

# 6) Create groupe_electrogene.csv
with (fixtures_dir / 'groupe_electrogene.csv').open('w', encoding='utf-8', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=['id_groupe', 'marque_groupe', 'puissance_groupe'])
    writer.writeheader()
    for row in groupe_rows:
        old_id = (row.get('id_groupe') or '').strip()
        if old_id:
            writer.writerow({
                'id_groupe': normalize_groupe_id(old_id),
                'marque_groupe': (row.get('marque_groupe') or '').strip(),
                'puissance_groupe': (row.get('puissance_groupe') or '').strip(),
            })

# 7) Create cuve_journaliere.csv
with (fixtures_dir / 'cuve_journaliere.csv').open('w', encoding='utf-8', newline='') as handle:
    writer = csv.DictWriter(handle, fieldnames=['id_cuve_journaliere', 'id_cuve_principale', 'id_groupe', 'capacite'])
    writer.writeheader()
    for idx, site in enumerate(sites, 1):
        matching = next((row for row in report_rows if row['site'] == site), None)
        groupe_id = normalize_groupe_id(matching['id_groupe']) if matching else 'g1-sdmo-830'
        writer.writerow({
            'id_cuve_journaliere': f'cj{idx:03d}',
            'id_cuve_principale': f'cp{idx:03d}',
            'id_groupe': groupe_id,
            'capacite': cj_capacity.get(site, '0'),
        })

# 8) Create rapport_1_carburflow.csv, rapport_2_carburflow.csv and rapport_3_carburflow.csv
for report_name in ['rapport_1_carburflow.csv', 'rapport_2_carburflow.csv', 'rapport_3_carburflow.csv']:
    with (fixtures_dir / report_name).open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=['id_cuve_journaliere', 'id_cuve_principale', 'id_groupe', 'quantite_cuve_principale', 'quantite_cuve_journaliere', 'depotage', 'compteur_horaire', 'etat_fonctionnement', 'observations'])
        writer.writeheader()
        for row in report_rows:
            if row['report_name'] != report_name:
                continue
            site = row['site']
            idx = sites.index(site) + 1
            writer.writerow({
                'id_cuve_journaliere': f'cj{idx:03d}',
                'id_cuve_principale': f'cp{idx:03d}',
                'id_groupe': normalize_groupe_id(row['id_groupe']),
                'quantite_cuve_principale': row['quantite_cuve_principale'],
                'quantite_cuve_journaliere': row['quantite_cuve_journaliere'],
                'depotage': row['depotage'],
                'compteur_horaire': row['compteur_horaire'],
                'etat_fonctionnement': row['etat_fonctionnement'],
                'observations': row['observations'],
            })

print('Fixtures generated successfully.')
