# apps/equipment/migrations/0001_initial.py
# Cette migration enregistre les modèles `equipment` (CuvePrincipale,
# CuveJournaliere, GroupeElectrogene) dans l'état de migration Django SANS
# toucher à la base : les tables existent déjà (créées historiquement par
# apps/sites/migrations/0001_initial et suivantes sous les mêmes db_table),
# et la migration sites/0005 va désormais les laisser en place puisque les
# modèles canoniques vivent dans equipment.
#
# On utilise `migrations.SeparateDatabaseAndState` :
# - state_operations : informe Django que ces modèles existent dans l'état
# - database_operations : vide (les tables existent déjà)
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    # Pas de dépendance : on enregistre les modèles dans l'état Django SANS
    # toucher la base (les tables existent déjà, créées historiquement
    # par sites). Cela évite un cycle avec alerts/0005 et sites/0005.
    dependencies = []

    state_operations = [
        migrations.CreateModel(
            name='CuvePrincipale',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('identifiant', models.CharField(max_length=100, unique=True)),
                ('capacite', models.FloatField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Cuve principale',
                'verbose_name_plural': 'Cuves principales',
                'db_table': 'cuve_principale',
                'ordering': ['identifiant'],
            },
        ),
        migrations.CreateModel(
            name='GroupeElectrogene',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('identifiant', models.CharField(max_length=100, unique=True)),
                ('marque', models.CharField(max_length=100)),
                ('puissance', models.CharField(max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Groupe électrogène',
                'verbose_name_plural': 'Groupes électrogènes',
                'db_table': 'groupe_electrogene',
                'ordering': ['identifiant'],
            },
        ),
        migrations.CreateModel(
            name='CuveJournaliere',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('identifiant', models.CharField(max_length=100, unique=True)),
                ('capacite', models.FloatField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Cuve journalière',
                'verbose_name_plural': 'Cuves journalières',
                'db_table': 'cuve_journaliere',
                'ordering': ['identifiant'],
            },
        ),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=state_operations,
            database_operations=[],
        ),
    ]
