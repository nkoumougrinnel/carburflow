from django.apps import AppConfig


class ImportConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.import'
    label = 'csv_import'
    verbose_name = 'Import / Export données'
