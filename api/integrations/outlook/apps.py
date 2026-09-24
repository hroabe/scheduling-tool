from django.apps import AppConfig


class OutlookIntegrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'integrations.outlook'
    label = 'outlook_integration'
    verbose_name = 'Outlook連携'
