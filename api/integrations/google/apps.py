from django.apps import AppConfig


class GoogleIntegrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'integrations.google'
    label = 'google_integration'
    verbose_name = 'Google連携'
