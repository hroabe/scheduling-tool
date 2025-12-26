"""
Schedule Models - 日程調整ツール

Modern Django 5.1 models with UUID-based URLs, notifications, and enhanced features.
"""

import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinLengthValidator


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
    
    # Management
    edit_key = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="編集キー",
        help_text="イベント編集用のパスワード"
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
    def can_respond(self):
        """回答可能かどうか"""
        return self.is_active and not self.is_expired and not self.is_finalized


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
    
    # Edit token for allowing participants to edit their own responses
    edit_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name="編集トークン",
        help_text="回答編集用のトークン"
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
