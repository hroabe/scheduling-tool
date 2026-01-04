"""
Accounts Models - User Integration and Profile

RFC-0003: ユーザー認証/アカウント機能
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from cryptography.fernet import Fernet
from django.conf import settings


def get_fernet_key():
    """Fernet encryption key from settings or use stable default for dev/test"""
    key = getattr(settings, 'FERNET_KEY', None)
    if key:
        return key.encode() if isinstance(key, str) else key
    # Development/Test fallback - stable key for testing
    # DO NOT USE IN PRODUCTION - set FERNET_KEY environment variable
    # This is a valid Fernet key (base64-encoded 32 bytes)
    return b'ZGV2LXRlc3QtZmVybmV0LWtleS0zMi1ieXRlcz0='


class UserIntegration(models.Model):
    """
    外部サービス連携情報
    
    Google/Outlook/Zoom等のOAuth連携トークンを管理
    """
    class Provider(models.TextChoices):
        GOOGLE = 'google', 'Google'
        OUTLOOK = 'outlook', 'Outlook (Microsoft)'
        ZOOM = 'zoom', 'Zoom'
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='integrations',
        verbose_name="ユーザー"
    )
    
    provider = models.CharField(
        max_length=50,
        choices=Provider.choices,
        verbose_name="プロバイダー"
    )
    
    # Encrypted tokens
    _access_token_encrypted = models.TextField(
        db_column='access_token_encrypted',
        verbose_name="アクセストークン（暗号化）"
    )
    _refresh_token_encrypted = models.TextField(
        db_column='refresh_token_encrypted',
        blank=True,
        null=True,
        verbose_name="リフレッシュトークン（暗号化）"
    )
    
    expires_at = models.DateTimeField(
        verbose_name="トークン有効期限"
    )
    
    scopes = models.TextField(
        blank=True,
        default="",
        verbose_name="許可スコープ",
        help_text="スペース区切りのスコープ一覧"
    )
    
    # Status tracking
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効"
    )
    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="無効化日時"
    )
    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="最終使用日時"
    )
    
    # Error tracking for retry logic
    last_error = models.TextField(
        blank=True,
        null=True,
        verbose_name="最終エラー"
    )
    error_count = models.PositiveIntegerField(
        default=0,
        verbose_name="エラー回数"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    
    class Meta:
        verbose_name = "外部連携"
        verbose_name_plural = "外部連携"
        unique_together = [['user', 'provider']]
        indexes = [
            models.Index(fields=['user', 'provider']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_provider_display()}"
    
    @property
    def is_expired(self):
        """トークンが期限切れかどうか"""
        return timezone.now() >= self.expires_at
    
    @property
    def is_valid(self):
        """連携が有効かどうか"""
        return self.is_active and not self.is_expired and self.revoked_at is None
    
    def _get_fernet(self):
        """Get Fernet instance for encryption/decryption"""
        return Fernet(get_fernet_key())
    
    def set_access_token(self, token: str) -> None:
        """Encrypt and set access token"""
        f = self._get_fernet()
        self._access_token_encrypted = f.encrypt(token.encode()).decode()
    
    def get_access_token(self) -> str:
        """Decrypt and return access token"""
        if not self._access_token_encrypted:
            return ""
        f = self._get_fernet()
        return f.decrypt(self._access_token_encrypted.encode()).decode()
    
    def set_refresh_token(self, token: str) -> None:
        """Encrypt and set refresh token"""
        if token:
            f = self._get_fernet()
            self._refresh_token_encrypted = f.encrypt(token.encode()).decode()
    
    def get_refresh_token(self) -> str:
        """Decrypt and return refresh token"""
        if not self._refresh_token_encrypted:
            return ""
        f = self._get_fernet()
        return f.decrypt(self._refresh_token_encrypted.encode()).decode()
    
    def mark_used(self):
        """Mark integration as recently used"""
        self.last_used_at = timezone.now()
        self.save(update_fields=['last_used_at'])
    
    def record_error(self, error: str):
        """Record an error for retry tracking"""
        self.last_error = error
        self.error_count += 1
        self.save(update_fields=['last_error', 'error_count', 'updated_at'])
    
    def clear_errors(self):
        """Clear error state after successful operation"""
        self.last_error = None
        self.error_count = 0
        self.save(update_fields=['last_error', 'error_count', 'updated_at'])
    
    def revoke(self):
        """Mark integration as revoked"""
        self.is_active = False
        self.revoked_at = timezone.now()
        self.save(update_fields=['is_active', 'revoked_at', 'updated_at'])


class UserProfile(models.Model):
    """
    ユーザープロファイル（Django Userの拡張）
    
    通知設定などユーザー固有の設定を保存
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name="ユーザー"
    )
    
    timezone_name = models.CharField(
        max_length=50,
        default="Asia/Tokyo",
        verbose_name="タイムゾーン"
    )
    
    # Notification preferences
    email_notifications = models.BooleanField(
        default=True,
        verbose_name="メール通知"
    )
    
    # Avatar (optional for future use)
    avatar_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="アバターURL"
    )
    
    # RFC-0006: i18n - preferred language
    LANGUAGE_CHOICES = [
        ('ja', '日本語'),
        ('en', 'English'),
        ('zh-hans', '简体中文'),
        ('zh-hant', '繁體中文'),
        ('ko', '한국어'),
        ('vi', 'Tiếng Việt'),
        ('pt', 'Português'),
    ]
    preferred_language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default='ja',
        verbose_name="優先言語",
        help_text="UIとメール通知の言語"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    
    class Meta:
        verbose_name = "ユーザープロファイル"
        verbose_name_plural = "ユーザープロファイル"
    
    def __str__(self):
        return f"{self.user.username}のプロファイル"
