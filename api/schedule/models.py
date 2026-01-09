"""
Schedule Models - 日程調整ツール

Modern Django 5.1 models with UUID-based URLs, notifications, and enhanced features.
"""

import uuid
import secrets
from django.db import models
from django.utils import timezone
from django.core.validators import MinLengthValidator
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.models import User



class Schedule(models.Model):
    """
    予定（イベント）
    
    調整さん相当の機能:
    - URL共有用のUUID
    - 回答期限
    - オーナー通知設定
    """
    # Primary identifier
    uuid = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
        verbose_name="識別子",
        help_text="URL共有用の一意識別子"
    )
    
    # Basic info
    name = models.CharField(
        max_length=200,
        validators=[MinLengthValidator(1)],
        verbose_name="イベント名",
        help_text="イベント名"
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name="説明",
        help_text="イベントの説明・メモ"
    )
    
    # Organizer info
    owner_name = models.CharField(
        max_length=100,
        verbose_name="主催者",
        help_text="主催者の名前"
    )
    owner_email = models.EmailField(
        blank=True,
        null=True,
        verbose_name="主催者メールアドレス",
        help_text="通知を受け取るメールアドレス（オプション）"
    )
    department = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name="所属",
        help_text="所属"
    )
    
    # RFC-0003: Owner user (authenticated user who created this schedule)
    owner_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='owned_schedules',
        verbose_name="オーナーユーザー",
        help_text="ログインユーザーが作成した場合にリンク"
    )
    
    # Management - Security: hash化移行中（新規はhashのみ、既存は平文フォールバック）
    edit_key = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="編集キー（旧・平文）",
        help_text="移行期間中のみ使用。新規作成では使用しない"
    )
    edit_key_hash = models.CharField(
        max_length=256,
        blank=True,
        null=True,
        verbose_name="編集キー（ハッシュ）",
        help_text="イベント編集用のパスワード（ハッシュ保存）"
    )
    
    # Settings
    deadline = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="回答期限",
        help_text="回答の締め切り日時"
    )
    timezone_name = models.CharField(
        max_length=50,
        default="Asia/Tokyo",
        verbose_name="タイムゾーン",
        help_text="イベントのタイムゾーン"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="有効",
        help_text="イベントが有効かどうか"
    )
    allow_maybe = models.BooleanField(
        default=True,
        verbose_name="「△」を許可",
        help_text="回答に「△（調整可能）」を許可するか"
    )
    show_participant_count = models.BooleanField(
        default=True,
        verbose_name="参加者数表示",
        help_text="参加者の回答数を表示するか"
    )
    
    # Notification settings
    notify_on_response = models.BooleanField(
        default=False,
        verbose_name="回答時通知",
        help_text="新しい回答があった時にメールで通知"
    )
    
    # Finalization
    is_finalized = models.BooleanField(
        default=False,
        verbose_name="確定済み",
        help_text="日程が確定したかどうか"
    )
    finalized_candidate = models.ForeignKey(
        'Candidate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='finalized_schedules',
        verbose_name="確定日程",
        help_text="確定した候補日程"
    )
    finalized_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="確定日時",
        help_text="日程が確定された日時"
    )
    closed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="締切日時",
        help_text="回答が締め切られた日時"
    )
    
    # RFC-0004: Meeting URL auto-generation
    MEETING_PROVIDER_CHOICES = [
        ('google_meet', 'Google Meet'),
        ('teams', 'Microsoft Teams'),
        ('zoom', 'Zoom'),
    ]
    meeting_provider = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        choices=MEETING_PROVIDER_CHOICES,
        verbose_name="会議プロバイダー",
        help_text="自動生成された会議URLのプロバイダー"
    )
    meeting_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="会議URL",
        help_text="自動生成された会議URL"
    )
    meeting_created_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="会議URL作成日時",
        help_text="会議URLが作成された日時"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="更新日時"
    )
    
    class Meta:
        verbose_name = "予定"
        verbose_name_plural = "予定"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['uuid']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_active', 'is_finalized']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def is_expired(self):
        """回答期限を過ぎているかどうか"""
        if self.deadline:
            return timezone.now() > self.deadline
        return False
    
    @property
    def is_closed(self):
        """回答が締め切られているかどうか"""
        return self.closed_at is not None
    
    @property
    def status(self):
        """
        イベントのステータス
        
        Returns:
            str: 'fixed' (確定), 'closed' (締切), 'open' (受付中)
        """
        if self.is_finalized:
            return 'fixed'
        elif self.is_closed or self.is_expired:
            return 'closed'
        return 'open'
    
    @property
    def can_respond(self):
        """回答可能かどうか"""
        return self.is_active and not self.is_expired and not self.is_finalized and not self.is_closed

    def set_edit_key(self, raw_key: str) -> None:
        """
        編集キーをハッシュ化して保存
        
        Args:
            raw_key: 平文の編集キー
        """
        self.edit_key_hash = make_password(raw_key)
        self.edit_key = None  # 平文は保存しない

    def check_edit_key(self, raw_key: str) -> bool:
        """
        編集キーを検証（hashのみ）
        
        Args:
            raw_key: 検証する平文キー
        Returns:
            bool: 一致すれば True
        """
        if not raw_key:
            return False
        if self.edit_key_hash:
            return check_password(raw_key, self.edit_key_hash)
        # 平文フォールバック削除済み - hashのみサポート
        return False

    @classmethod
    def generate_edit_key(cls) -> str:
        """安全な編集キーを生成"""
        return secrets.token_urlsafe(16)


class Candidate(models.Model):
    """
    候補日程
    
    開始・終了時刻を持つ日程候補
    """
    schedule = models.ForeignKey(
        Schedule,
        on_delete=models.CASCADE,
        related_name="candidates",
        verbose_name="予定"
    )
    
    start_at = models.DateTimeField(
        verbose_name="開始日時",
        help_text="候補の開始日時"
    )
    end_at = models.DateTimeField(
        verbose_name="終了日時",
        help_text="候補の終了日時"
    )
    
    note = models.CharField(
        max_length=200,
        blank=True,
        default="",
        verbose_name="備考",
        help_text="この候補に関する備考"
    )
    
    # Display order
    order = models.PositiveIntegerField(
        default=0,
        verbose_name="表示順",
        help_text="表示順序"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="作成日時"
    )
    
    class Meta:
        verbose_name = "候補日程"
        verbose_name_plural = "候補日程"
        ordering = ['order', 'start_at']
        indexes = [
            models.Index(fields=['schedule', 'order']),
        ]
    
    def __str__(self):
        return f"{self.start_at.strftime('%Y/%m/%d %H:%M')} - {self.end_at.strftime('%H:%M')}"
    
    @property
    def ok_count(self):
        """◯の回答数"""
        return self.attendances.filter(status='ok').count()
    
    @property
    def maybe_count(self):
        """△の回答数"""
        return self.attendances.filter(status='maybe').count()
    
    @property
    def ng_count(self):
        """×の回答数"""
        return self.attendances.filter(status='ng').count()


class Participant(models.Model):
    """
    参加者
    
    イベントへの回答者情報
    """
    schedule = models.ForeignKey(
        Schedule,
        on_delete=models.CASCADE,
        related_name="participants",
        verbose_name="予定"
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name="名前",
        help_text="参加者の名前"
    )
    
    comment = models.TextField(
        blank=True,
        default="",
        verbose_name="コメント",
        help_text="参加者からのコメント"
    )
    
    # Edit token - Security: hash化移行中（新規はhashのみ、既存は平文フォールバック）
    edit_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name="編集トークン（旧・平文）",
        help_text="移行期間中のみ使用。新規作成では使用しない"
    )
    edit_token_hash = models.CharField(
        max_length=256,
        blank=True,
        null=True,
        verbose_name="編集トークン（ハッシュ）",
        help_text="回答編集用のトークン（ハッシュ保存）"
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
        verbose_name = "参加者"
        verbose_name_plural = "参加者"
        ordering = ['created_at']
        # Same name can appear multiple times in different schedules
        unique_together = [['schedule', 'name']]
    
    def __str__(self):
        return self.name

    def set_edit_token(self, raw_token: str) -> None:
        """
        編集トークンをハッシュ化して保存
        
        Args:
            raw_token: 平文のトークン
        """
        self.edit_token_hash = make_password(raw_token)
        # 既存の edit_token は unique 制約があるため、新規生成時のみ設定

    def check_edit_token(self, raw_token: str) -> bool:
        """
        編集トークンを検証（hashのみ）
        
        Args:
            raw_token: 検証する平文トークン
        Returns:
            bool: 一致すれば True
        """
        if not raw_token:
            return False
        if self.edit_token_hash:
            return check_password(raw_token, self.edit_token_hash)
        # 平文フォールバック削除済み - hashのみサポート
        return False

    @classmethod
    def generate_edit_token(cls) -> str:
        """安全な編集トークンを生成"""
        return secrets.token_urlsafe(24)


class Attendance(models.Model):
    """
    出欠回答
    
    参加者ごとの各候補日に対する出欠状況
    """
    class Status(models.TextChoices):
        OK = 'ok', '◯'
        MAYBE = 'maybe', '△'
        NG = 'ng', '×'
        PENDING = 'pending', '未回答'
    
    schedule = models.ForeignKey(
        Schedule,
        on_delete=models.CASCADE,
        related_name="attendances",
        verbose_name="予定"
    )
    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name="attendances",
        verbose_name="参加者"
    )
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name="attendances",
        verbose_name="候補日程"
    )
    
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="出欠"
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
        verbose_name = "出欠"
        verbose_name_plural = "出欠"
        # One attendance per participant per candidate
        unique_together = [['participant', 'candidate']]
        indexes = [
            models.Index(fields=['schedule', 'candidate']),
            models.Index(fields=['participant', 'status']),
        ]
    
    def __str__(self):
        return f"{self.participant.name}: {self.get_status_display()}"


class Notification(models.Model):
    """
    通知ログ
    
    送信された通知の記録
    """
    class NotificationType(models.TextChoices):
        NEW_RESPONSE = 'new_response', '新規回答'
        DEADLINE_REMINDER = 'deadline_reminder', '期限リマインダー'
        SCHEDULE_FINALIZED = 'finalized', '日程確定'
    
    schedule = models.ForeignKey(
        Schedule,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="予定"
    )
    
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        verbose_name="通知タイプ"
    )
    
    recipient_email = models.EmailField(
        verbose_name="送信先"
    )
    
    subject = models.CharField(
        max_length=200,
        verbose_name="件名"
    )
    
    body = models.TextField(
        verbose_name="本文"
    )
    
    sent_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="送信日時"
    )
    
    is_sent = models.BooleanField(
        default=False,
        verbose_name="送信済み"
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        verbose_name="エラーメッセージ"
    )
    
    class Meta:
        verbose_name = "通知"
        verbose_name_plural = "通知"
        ordering = ['-sent_at']
    
    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.schedule.name}"
