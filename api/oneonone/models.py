"""
1-on-1 Scheduling Models
RFC-0005: 1対1日程調整モード（Calendly風）

Models for availability pages, slots, and bookings.
"""

import uuid
import secrets
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.validators import MinLengthValidator


class AvailabilityPage(models.Model):
    """
    公開空き枠ページ
    
    ホストが公開URL経由で予約を受け付けるためのページ
    ログイン不要モードでは owner=None, host_token と verify_token で管理
    """
    STATUS_CHOICES = [
        ('DRAFT', '下書き'),
        ('PENDING_VERIFY', 'メール認証待ち'),
        ('PUBLISHED', '公開中'),
        ('UNPUBLISHED', '非公開'),
    ]
    
    # Owner (optional for anonymous booking)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='availability_pages',
        verbose_name="オーナー",
        null=True,
        blank=True
    )
    
    # Anonymous host info (for login-free mode)
    organizer_name = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="主催者名"
    )
    organizer_email = models.EmailField(
        blank=True,
        default="",
        verbose_name="主催者メールアドレス"
    )
    
    # Security tokens (stored as hashes)
    host_token_hash = models.CharField(
        max_length=128,
        blank=True,
        default="",
        verbose_name="管理トークンハッシュ"
    )
    verify_token_hash = models.CharField(
        max_length=128,
        blank=True,
        default="",
        verbose_name="認証トークンハッシュ"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT',
        verbose_name="ステータス"
    )
    
    # Public identifier
    slug = models.SlugField(
        max_length=100,
        unique=True,
        validators=[MinLengthValidator(3)],
        verbose_name="スラッグ",
        help_text="公開URLで使用される一意の識別子"
    )
    
    # Page info
    title = models.CharField(
        max_length=200,
        verbose_name="タイトル",
        help_text="予約ページのタイトル"
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name="説明",
        help_text="予約ページの説明"
    )
    
    # Settings
    timezone_name = models.CharField(
        max_length=50,
        default="Asia/Tokyo",
        verbose_name="タイムゾーン"
    )
    duration_minutes = models.PositiveIntegerField(
        default=30,
        verbose_name="予約時間（分）",
        help_text="各予約の長さ"
    )
    buffer_minutes = models.PositiveIntegerField(
        default=0,
        verbose_name="バッファ時間（分）",
        help_text="予約間の空き時間"
    )
    
    # Visibility (legacy, use 'status' instead)
    is_public = models.BooleanField(
        default=True,
        verbose_name="公開",
        help_text="予約ページを公開するか"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効",
        help_text="予約を受け付けるか"
    )
    
    # Notification
    notify_on_booking = models.BooleanField(
        default=True,
        verbose_name="予約時通知",
        help_text="予約があった時にメールで通知"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")
    
    class Meta:
        verbose_name = "予約ページ"
        verbose_name_plural = "予約ページ"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.slug})"
    
    @property
    def public_url(self):
        """公開URL"""
        return f"/booking/{self.slug}"
    
    @property
    def is_anonymous(self):
        """匿名（ログイン不要）モードかどうか"""
        return self.owner is None
    
    def set_host_token(self, token: str):
        """hostトークンをハッシュ化して保存"""
        import hashlib
        self.host_token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    def verify_host_token(self, token: str) -> bool:
        """hostトークンを検証"""
        import hashlib
        return self.host_token_hash == hashlib.sha256(token.encode()).hexdigest()
    
    def set_verify_token(self, token: str):
        """verifyトークンをハッシュ化して保存"""
        import hashlib
        self.verify_token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    def verify_verify_token(self, token: str) -> bool:
        """verifyトークンを検証"""
        import hashlib
        return self.verify_token_hash == hashlib.sha256(token.encode()).hexdigest()
    
    def get_available_slots(self, from_date=None, to_date=None):
        """予約可能な空き枠を取得"""
        now = timezone.now()
        queryset = self.slots.filter(
            is_booked=False,
            start_at__gte=now,
        )
        if from_date:
            queryset = queryset.filter(start_at__gte=from_date)
        if to_date:
            queryset = queryset.filter(start_at__lt=to_date)
        return queryset.order_by('start_at')


class AvailabilitySlot(models.Model):
    """
    空き枠スロット
    
    ホストが予約可能な時間枠
    """
    page = models.ForeignKey(
        AvailabilityPage,
        on_delete=models.CASCADE,
        related_name='slots',
        verbose_name="予約ページ"
    )
    
    # Time
    start_at = models.DateTimeField(verbose_name="開始日時")
    end_at = models.DateTimeField(verbose_name="終了日時")
    
    # Status
    is_booked = models.BooleanField(
        default=False,
        verbose_name="予約済み"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")
    
    class Meta:
        verbose_name = "空き枠"
        verbose_name_plural = "空き枠"
        ordering = ['start_at']
        # Prevent overlapping slots
        constraints = [
            models.UniqueConstraint(
                fields=['page', 'start_at'],
                name='unique_slot_per_time'
            ),
        ]
    
    def __str__(self):
        return f"{self.page.title} - {self.start_at.strftime('%Y/%m/%d %H:%M')}"
    
    @property
    def is_available(self):
        """予約可能かどうか"""
        return not self.is_booked and self.start_at > timezone.now()


class Booking(models.Model):
    """
    予約
    
    ゲストによる空き枠の予約
    """
    STATUS_CHOICES = [
        ('pending', '確認中'),
        ('confirmed', '確定'),
        ('cancelled', 'キャンセル'),
        ('completed', '完了'),
    ]
    
    # Unique identifier
    uuid = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
        verbose_name="識別子"
    )
    
    # Relations
    slot = models.OneToOneField(
        AvailabilitySlot,
        on_delete=models.CASCADE,
        related_name='booking',
        verbose_name="予約枠"
    )
    
    # Cancel token for guest
    cancel_token = models.CharField(
        max_length=64,
        default=secrets.token_urlsafe,
        verbose_name="キャンセルトークン"
    )
    
    # Guest info
    guest_name = models.CharField(
        max_length=100,
        verbose_name="ゲスト名"
    )
    guest_email = models.EmailField(
        verbose_name="ゲストメールアドレス"
    )
    guest_message = models.TextField(
        blank=True,
        default="",
        verbose_name="メッセージ",
        help_text="ゲストからのメッセージ"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="ステータス"
    )
    
    # Meeting info (RFC-0004 integration)
    meeting_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="会議URL"
    )
    
    # Timestamps
    confirmed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="確定日時"
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="キャンセル日時"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")
    
    class Meta:
        verbose_name = "予約"
        verbose_name_plural = "予約"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.guest_name} - {self.slot}"
    
    @property
    def host(self):
        """ホスト（予約ページのオーナー）"""
        return self.slot.page.owner
    
    @property
    def page(self):
        """予約ページ"""
        return self.slot.page
    
    def confirm(self):
        """予約を確定"""
        if self.status == 'pending':
            self.status = 'confirmed'
            self.confirmed_at = timezone.now()
            self.save(update_fields=['status', 'confirmed_at', 'updated_at'])
    
    def cancel(self):
        """予約をキャンセル"""
        if self.status in ('pending', 'confirmed'):
            self.status = 'cancelled'
            self.cancelled_at = timezone.now()
            self.slot.is_booked = False
            self.slot.save(update_fields=['is_booked', 'updated_at'])
            self.save(update_fields=['status', 'cancelled_at', 'updated_at'])
    
    def complete(self):
        """予約を完了"""
        if self.status == 'confirmed':
            self.status = 'completed'
            self.save(update_fields=['status', 'updated_at'])
