"""Script de diagnostic rapide pour vérifier les données importées."""
import os
import sys
import django

sys.path.insert(0, '/app/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.prod')
django.setup()

from apps.sites.models import Site
from apps.equipment.models import CuvePrincipale, CuveJournaliere, GroupeElectrogene
from apps.reports.models import Rapport, LigneRapport
from django.contrib.auth import get_user_model

User = get_user_model()

print('=' * 50)
print('DIAGNOSTIC BASE DE DONNEES')
print('=' * 50)
print(f'Sites         : {Site.objects.count()}')
print(f'Cuves princ.  : {CuvePrincipale.objects.count()}')
print(f'Cuves journ.  : {CuveJournaliere.objects.count()}')
print(f'Groupes       : {GroupeElectrogene.objects.count()}')
print(f'Rapports      : {Rapport.objects.count()}')
print(f'Lignes        : {LigneRapport.objects.count()}')
print(f'Utilisateurs  : {User.objects.count()}')
print('=' * 50)

if User.objects.count() > 0:
    print('\nComptes disponibles:')
    for u in User.objects.all():
        print(f'  - {u.username} (admin={u.is_staff}, super={u.is_superuser})')
