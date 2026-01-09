# Generated migration for anonymous booking fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('oneonone', '0001_initial'),
    ]

    operations = [
        # Make owner optional
        migrations.AlterField(
            model_name='availabilitypage',
            name='owner',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='availability_pages',
                to='auth.user',
                verbose_name='オーナー',
            ),
        ),
        # Add organizer fields
        migrations.AddField(
            model_name='availabilitypage',
            name='organizer_name',
            field=models.CharField(blank=True, default='', max_length=100, verbose_name='主催者名'),
        ),
        migrations.AddField(
            model_name='availabilitypage',
            name='organizer_email',
            field=models.EmailField(blank=True, default='', max_length=254, verbose_name='主催者メールアドレス'),
        ),
        # Add security tokens
        migrations.AddField(
            model_name='availabilitypage',
            name='host_token_hash',
            field=models.CharField(blank=True, default='', max_length=128, verbose_name='管理トークンハッシュ'),
        ),
        migrations.AddField(
            model_name='availabilitypage',
            name='verify_token_hash',
            field=models.CharField(blank=True, default='', max_length=128, verbose_name='認証トークンハッシュ'),
        ),
        # Add status field
        migrations.AddField(
            model_name='availabilitypage',
            name='status',
            field=models.CharField(
                choices=[
                    ('DRAFT', '下書き'),
                    ('PENDING_VERIFY', 'メール認証待ち'),
                    ('PUBLISHED', '公開中'),
                    ('UNPUBLISHED', '非公開'),
                ],
                default='DRAFT',
                max_length=20,
                verbose_name='ステータス',
            ),
        ),
    ]
