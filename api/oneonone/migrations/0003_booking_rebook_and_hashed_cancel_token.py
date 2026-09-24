"""
RFC-0005 v2 (docs/11_integration.md):
- Booking.slot: OneToOne -> ForeignKey + unique constraint on *active* bookings,
  so a slot can be booked again after a cancellation.
- Booking.cancel_token (plaintext) -> cancel_token_hash (SHA-256). Existing tokens
  are hashed before the plaintext column is dropped, so issued links keep working.
- Pages created by logged-in users are published on creation; existing DRAFT pages
  of logged-in users are moved to PUBLISHED / UNPUBLISHED according to is_public.
"""

import hashlib

import django.db.models.deletion
from django.db import migrations, models


def publish_owner_pages(apps, schema_editor):
    """ログインユーザーが作成した既存ページ（DRAFTのまま）を is_public に従って公開状態へ"""
    AvailabilityPage = apps.get_model('oneonone', 'AvailabilityPage')
    pages = AvailabilityPage.objects.filter(owner__isnull=False, status='DRAFT')
    pages.filter(is_public=True).update(status='PUBLISHED')
    pages.filter(is_public=False).update(status='UNPUBLISHED')


def hash_cancel_tokens(apps, schema_editor):
    Booking = apps.get_model('oneonone', 'Booking')
    for booking in Booking.objects.exclude(cancel_token=''):
        booking.cancel_token_hash = hashlib.sha256(booking.cancel_token.encode()).hexdigest()
        booking.save(update_fields=['cancel_token_hash'])


class Migration(migrations.Migration):

    dependencies = [
        ('oneonone', '0002_add_anonymous_booking_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='cancel_token_hash',
            field=models.CharField(blank=True, default='', max_length=64, verbose_name='キャンセルトークン（ハッシュ）'),
        ),
        migrations.RunPython(hash_cancel_tokens, migrations.RunPython.noop),
        migrations.RunPython(publish_owner_pages, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='booking',
            name='cancel_token',
        ),
        migrations.AlterField(
            model_name='booking',
            name='slot',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bookings', to='oneonone.availabilityslot', verbose_name='予約枠'),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.UniqueConstraint(condition=models.Q(('status__in', ['pending', 'confirmed'])), fields=('slot',), name='unique_active_booking_per_slot'),
        ),
    ]
