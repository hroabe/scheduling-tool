"""
Celery tasks for async operations

Email notifications, reminders, and scheduled tasks.
"""

from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone

import logging

logger = logging.getLogger(__name__)


@shared_task
def send_response_notification(schedule_id: int, participant_id: int):
    """
    新規回答の通知メールを送信
    
    Args:
        schedule_id: スケジュールID
        participant_id: 参加者ID
    """
    from .models import Schedule, Participant, Notification
    
    try:
        schedule = Schedule.objects.get(id=schedule_id)
        participant = Participant.objects.get(id=participant_id)
        
        if not schedule.owner_email:
            logger.warning(f"No owner email for schedule {schedule_id}")
            return
        
        subject = f"【日程調整】{participant.name}さんが回答しました - {schedule.name}"
        
        body = f"""
{schedule.owner_name} 様

「{schedule.name}」に新しい回答がありました。

回答者: {participant.name}
コメント: {participant.comment or 'なし'}

▼ 回答状況を確認
{settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else ''}/event/{schedule.uuid}

---
日程調整ツール
"""
        
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[schedule.owner_email],
            fail_silently=False,
        )
        
        # Log notification
        Notification.objects.create(
            schedule=schedule,
            notification_type='new_response',
            recipient_email=schedule.owner_email,
            subject=subject,
            body=body,
            is_sent=True,
        )
        
        logger.info(f"Sent response notification for schedule {schedule_id}")
        
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")
        
        # Log failed notification
        try:
            Notification.objects.create(
                schedule_id=schedule_id,
                notification_type='new_response',
                recipient_email=schedule.owner_email if 'schedule' in locals() else '',
                subject=f"Failed notification for schedule {schedule_id}",
                body='',
                is_sent=False,
                error_message=str(e),
            )
        except Exception:
            pass


@shared_task
def send_deadline_reminders():
    """
    回答期限が近いスケジュールのリマインダーを送信
    
    期限24時間前に通知
    """
    from .models import Schedule, Notification
    
    now = timezone.now()
    reminder_threshold = now + timezone.timedelta(hours=24)
    
    schedules = Schedule.objects.filter(
        is_active=True,
        is_finalized=False,
        deadline__isnull=False,
        deadline__lte=reminder_threshold,
        deadline__gt=now,
        owner_email__isnull=False,
    )
    
    for schedule in schedules:
        # Check if reminder already sent
        if Notification.objects.filter(
            schedule=schedule,
            notification_type='deadline_reminder',
            sent_at__gte=now - timezone.timedelta(hours=23),
        ).exists():
            continue
        
        subject = f"【日程調整】回答期限が近づいています - {schedule.name}"
        
        body = f"""
{schedule.owner_name} 様

「{schedule.name}」の回答期限が近づいています。

回答期限: {schedule.deadline.strftime('%Y年%m月%d日 %H:%M')}
現在の回答者数: {schedule.participants.count()}名

▼ 回答状況を確認
/event/{schedule.uuid}

---
日程調整ツール
"""
        
        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[schedule.owner_email],
                fail_silently=False,
            )
            
            Notification.objects.create(
                schedule=schedule,
                notification_type='deadline_reminder',
                recipient_email=schedule.owner_email,
                subject=subject,
                body=body,
                is_sent=True,
            )
            
            logger.info(f"Sent deadline reminder for schedule {schedule.id}")
            
        except Exception as e:
            logger.error(f"Failed to send deadline reminder: {e}")


@shared_task
def cleanup_old_schedules():
    """
    古いスケジュールをクリーンアップ
    
    6ヶ月以上前の非アクティブなスケジュールを削除
    """
    from .models import Schedule
    
    cutoff_date = timezone.now() - timezone.timedelta(days=180)
    
    deleted_count, _ = Schedule.objects.filter(
        created_at__lt=cutoff_date,
        is_active=False,
    ).delete()
    
    logger.info(f"Cleaned up {deleted_count} old schedules")
    
    return deleted_count
