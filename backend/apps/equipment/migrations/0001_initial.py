# Transfert d’état : les tables existent déjà (sites.0001–0004, mêmes db_table).
# database_operations vide → aucun CREATE/DROP SQL.
# L’état doit coller à apps.equipment.models (FK incluses), sinon
# makemigrations propose des AddField qui cassent une base déjà peuplée.
import django.db.models.deletion
from django.db import migrations, models

import apps.equipment.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('sites', '0004_cuvejournaliere_cjxxx'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='CuvePrincipale',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('identifiant', models.CharField(
                            help_text='Format CPxxx (ex. CP001)',
                            max_length=100,
                            unique=True,
                            validators=[apps.equipment.models.validate_cp_identifiant],
                        )),
                        ('capacite', models.FloatField()),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('site', models.ForeignKey(
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name='cuves_principales',
                            to='sites.site',
                        )),
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
                        ('identifiant', models.CharField(
                            help_text='Format CJxxx (ex. CJ001)',
                            max_length=100,
                            unique=True,
                            validators=[apps.equipment.models.validate_cj_identifiant],
                        )),
                        ('capacite', models.FloatField()),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('cuve_principale', models.ForeignKey(
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name='cuves_journalieres',
                            to='equipment.cuveprincipale',
                        )),
                        ('groupe_electrogene', models.OneToOneField(
                            blank=True,
                            null=True,
                            on_delete=django.db.models.deletion.PROTECT,
                            related_name='cuve_journaliere',
                            to='equipment.groupeelectrogene',
                        )),
                    ],
                    options={
                        'verbose_name': 'Cuve journalière',
                        'verbose_name_plural': 'Cuves journalières',
                        'db_table': 'cuve_journaliere',
                        'ordering': ['identifiant'],
                    },
                ),
            ],
            database_operations=[],
        ),
    ]
