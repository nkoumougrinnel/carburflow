from django.db import migrations, models


def migrate_legacy_operators(apps, schema_editor):
    UserProfile = apps.get_model('dashboard', 'UserProfile')
    UserProfile.objects.filter(role='user').update(role='operateur')


def reverse_legacy_operators(apps, schema_editor):
    UserProfile = apps.get_model('dashboard', 'UserProfile')
    UserProfile.objects.filter(role='operateur').update(role='user')


class Migration(migrations.Migration):

    dependencies = [
        ('dashboard', '0006_remove_cuvejournaliere_code'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Administrateur'),
                    ('operateur', 'Opérateur'),
                    ('user', 'Utilisateur'),
                ],
                default='user',
                max_length=20,
                verbose_name='Rôle',
            ),
        ),
        migrations.RunPython(migrate_legacy_operators, reverse_legacy_operators),
    ]
