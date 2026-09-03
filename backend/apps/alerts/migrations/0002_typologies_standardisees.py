"""Standardisation des 5 typologies d'alertes.

- Renomme les codes types historiques :
    conso_sans_horaire → conso_sans_fonctionnement
    horaire_sans_conso → fonctionnement_sans_consommation
  (les clés anti-doublon contenant l'ancien code suivent le renommage)
- Ajoute l'instant réel de détection (`date_detection`, date + heure).
- Met à jour les `choices` de `type_alerte` (grille figée des 5 typologies).
"""

from django.db import migrations, models

TYPE_RENAMES = {
    'conso_sans_horaire': 'conso_sans_fonctionnement',
    'horaire_sans_conso': 'fonctionnement_sans_consommation',
}

NEW_CHOICES = [
    ('autonomie_critique', 'Autonomie inférieure à 24 h'),
    ('autonomie_preventive', 'Autonomie inférieure à 36 h'),
    ('conso_sans_fonctionnement', 'Consommation sans fonctionnement'),
    ('fonctionnement_sans_consommation', 'Fonctionnement sans consommation'),
    ('ecart_conso', 'Écart de consommation horaire'),
    ('compteur_incoherent', 'Compteur horaire incohérent'),
]


def renommer_types(apps, schema_editor):
    Alerte = apps.get_model('alerts', 'Alerte')
    for old, new in TYPE_RENAMES.items():
        Alerte.objects.filter(type_alerte=old).update(type_alerte=new)
    for old, new in TYPE_RENAMES.items():
        for alerte in Alerte.objects.filter(cle__contains=f'-{old}').iterator():
            alerte.cle = (alerte.cle or '').replace(f'-{old}', f'-{new}')
            alerte.save(update_fields=['cle'])


def restaurer_types(apps, schema_editor):
    Alerte = apps.get_model('alerts', 'Alerte')
    for old, new in TYPE_RENAMES.items():
        Alerte.objects.filter(type_alerte=new).update(type_alerte=old)
    for old, new in TYPE_RENAMES.items():
        for alerte in Alerte.objects.filter(cle__contains=f'-{new}').iterator():
            alerte.cle = (alerte.cle or '').replace(f'-{new}', f'-{old}')
            alerte.save(update_fields=['cle'])


def flush_contraintes_differees(apps, schema_editor):
    # PostgreSQL refuse CREATE INDEX tant que des triggers d'un UPDATE
    # précédent (RunPython) sont encore différés dans la même transaction.
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute('SET CONSTRAINTS ALL IMMEDIATE')


class Migration(migrations.Migration):

    # RunPython (UPDATE) + CREATE INDEX dans la même transaction PostgreSQL
    # lève : cannot CREATE INDEX "alerte" because it has pending trigger events
    atomic = False

    dependencies = [
        ('alerts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='alerte',
            name='date_detection',
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                help_text=(
                    'Instant réel de détection (dépôt de fiche) — '
                    'date + heure affichées dans l’UI.'
                ),
                null=True,
            ),
        ),
        migrations.RunPython(renommer_types, restaurer_types),
        migrations.RunPython(flush_contraintes_differees, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='alerte',
            name='type_alerte',
            field=models.CharField(
                choices=NEW_CHOICES,
                db_index=True,
                default='ecart_conso',
                max_length=50,
            ),
        ),
    ]
