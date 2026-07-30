# Generated manually for modèle Alerte métier CarburFlow

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('alerts', '0002_alerte_cle_justification'),
    ]

    operations = [
        migrations.AddField(
            model_name='alerte',
            name='donnees_contexte',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Données ayant déclenché l’alerte (autonomie, écart, ids…)',
            ),
        ),
        migrations.AlterField(
            model_name='alerte',
            name='date_apparition',
            field=models.DateField(auto_now_add=True, db_index=True),
        ),
        migrations.AlterField(
            model_name='alerte',
            name='priorite',
            field=models.CharField(
                choices=[
                    ('critique', 'Critique'),
                    ('haute', 'Haute'),
                    ('moyenne', 'Moyenne'),
                    ('basse', 'Basse'),
                ],
                db_index=True,
                default='moyenne',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='alerte',
            name='type_alerte',
            field=models.CharField(
                choices=[
                    ('autonomie_critique', 'Autonomie critique (< 24h)'),
                    ('conso_sans_horaire', 'Consommation sans delta horaire'),
                    ('ecart_conso', 'Écart de consommation (> 15%)'),
                    ('autonomie_preventive', 'Autonomie préventive (< 72h)'),
                ],
                db_index=True,
                default='ecart_conso',
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name='alerte',
            name='etat',
            field=models.CharField(
                choices=[
                    ('nouvelle', 'Nouvelle'),
                    ('en_cours', 'En cours'),
                    ('traitee', 'Traitée'),
                    ('ignoree', 'Ignorée'),
                ],
                db_index=True,
                default='nouvelle',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='alerte',
            name='cle',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='Clé unique anti-doublon (ex: groupe-3-autonomie_critique)',
                max_length=120,
                null=True,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name='alerte',
            name='message',
            field=models.TextField(help_text='Message explicatif affiché dans le dashboard'),
        ),
        migrations.AddIndex(
            model_name='alerte',
            index=models.Index(fields=['etat', 'priorite'], name='alerte_etat_pri_idx'),
        ),
        migrations.AddIndex(
            model_name='alerte',
            index=models.Index(fields=['site', 'etat'], name='alerte_site_etat_idx'),
        ),
        migrations.AddIndex(
            model_name='alerte',
            index=models.Index(
                fields=['type_alerte', 'date_apparition'],
                name='alerte_type_date_idx',
            ),
        ),
    ]
