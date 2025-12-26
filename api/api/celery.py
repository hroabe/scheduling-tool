"""
Celery configuration for the scheduling tool
"""

import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')

app = Celery('scheduling_tool')

# Load configuration from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# Periodic tasks
app.conf.beat_schedule = {
    'send-deadline-reminders-hourly': {
        'task': 'schedule.tasks.send_deadline_reminders',
        'schedule': crontab(minute=0),  # Every hour
    },
    'cleanup-old-schedules-weekly': {
        'task': 'schedule.tasks.cleanup_old_schedules',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),  # Sunday 3:00 AM
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery"""
    print(f'Request: {self.request!r}')
