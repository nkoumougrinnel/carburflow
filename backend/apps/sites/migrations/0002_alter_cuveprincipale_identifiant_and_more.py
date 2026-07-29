# Generated manually to restore missing migration file (already applied in DB)

import django.core.validators
from django.db import migrations, models

import apps.sites.models


class Migration(migrations.Migration):

    dependencies = [
        ('sites', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cuveprincipale',
            name='identifiant',
            field=models.CharField(
                help_text='Format CPxxx (ex. CP001)',
                max_length=100,
                unique=True,
                validators=[apps.sites.models.validate_cp_identifiant],
            ),
        ),
        migrations.AlterField(
            model_name='site',
            name='localisation',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
