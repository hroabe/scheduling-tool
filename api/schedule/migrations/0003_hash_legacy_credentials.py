"""
Hash legacy plaintext credentials (docs/03_database.md "Migration 2", docs/11_integration.md).

- Schedule.edit_key (plaintext) -> Schedule.edit_key_hash, plaintext cleared
- Participant.edit_token (legacy UUID) -> Participant.edit_token_hash when no hash exists,
  so tokens handed out before hashing keep working.

Idempotent; reverse is a no-op because hashing is irreversible.
"""

from django.contrib.auth.hashers import make_password
from django.db import migrations


def hash_legacy_credentials(apps, schema_editor):
    Schedule = apps.get_model('schedule', 'Schedule')
    Participant = apps.get_model('schedule', 'Participant')

    for schedule in Schedule.objects.exclude(edit_key__isnull=True).exclude(edit_key=''):
        if not schedule.edit_key_hash:
            schedule.edit_key_hash = make_password(schedule.edit_key)
        schedule.edit_key = None
        schedule.save(update_fields=['edit_key', 'edit_key_hash'])

    for participant in Participant.objects.filter(edit_token_hash__isnull=True):
        participant.edit_token_hash = make_password(str(participant.edit_token))
        participant.save(update_fields=['edit_token_hash'])


class Migration(migrations.Migration):

    dependencies = [
        ('schedule', '0002_add_finalization_timestamps'),
    ]

    operations = [
        migrations.RunPython(hash_legacy_credentials, migrations.RunPython.noop),
    ]
