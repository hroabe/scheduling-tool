"""
Hash any plaintext edit_key values (docs/03_database.md "Migration 2").

Keys that are already hashed are left untouched, so the migration is idempotent.
Reverse is a no-op because hashing is irreversible.
"""

from django.contrib.auth.hashers import identify_hasher, make_password
from django.db import migrations


def hash_edit_keys(apps, schema_editor):
    Schedule = apps.get_model('schedule', 'Schedule')
    for schedule in Schedule.objects.exclude(edit_key__isnull=True).exclude(edit_key=''):
        try:
            identify_hasher(schedule.edit_key)
        except ValueError:
            schedule.edit_key = make_password(schedule.edit_key)
            schedule.save(update_fields=['edit_key'])


class Migration(migrations.Migration):

    dependencies = [
        ('schedule', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(hash_edit_keys, migrations.RunPython.noop),
    ]
