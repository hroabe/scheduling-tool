"""
Outlook Calendar Celery Tasks
RFC-0002: Outlookカレンダー連携

Async tasks for calendar event creation after schedule finalization.
"""

import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
)
def create_outlook_calendar_event(self, schedule_id: int):
    """
    Create Outlook Calendar event for finalized schedule
    
    Args:
        schedule_id: ID of the finalized Schedule
    """
    from schedule.models import Schedule, Notification
    from accounts.models import UserIntegration
    from .client import (
        OutlookCalendarClient,
        OutlookCalendarError,
        refresh_access_token,
    )
    
    logger.info(f'Creating Outlook Calendar event for schedule {schedule_id}')
    
    try:
        schedule = Schedule.objects.select_related(
            'owner_user', 'finalized_candidate'
        ).get(id=schedule_id)
    except Schedule.DoesNotExist:
        logger.error(f'Schedule {schedule_id} not found')
        return
    
    if not schedule.is_finalized or not schedule.finalized_candidate:
        logger.warning(f'Schedule {schedule_id} is not finalized')
        return
    
    if not schedule.owner_user:
        logger.info(f'Schedule {schedule_id} has no owner_user, skipping')
        return
    
    try:
        integration = UserIntegration.objects.get(
            user=schedule.owner_user,
            provider='outlook',
            is_active=True,
        )
    except UserIntegration.DoesNotExist:
        logger.info(f'No Outlook integration for user {schedule.owner_user.id}')
        return
    
    if integration.is_expired:
        refresh_token = integration.get_refresh_token()
        if not refresh_token:
            logger.warning(f'No refresh token for integration {integration.id}')
            integration.revoke()
            return
        
        try:
            new_tokens = refresh_access_token(refresh_token)
            integration.set_access_token(new_tokens['access_token'])
            integration.expires_at = timezone.now() + timedelta(
                seconds=new_tokens.get('expires_in', 3600)
            )
            if new_tokens.get('refresh_token'):
                integration.set_refresh_token(new_tokens['refresh_token'])
            integration.save()
        except OutlookCalendarError as e:
            logger.error(f'Token refresh failed for integration {integration.id}: {e}')
            integration.record_error(str(e))
            raise self.retry(exc=e)
    
    try:
        client = OutlookCalendarClient(integration.get_access_token())
        
        candidate = schedule.finalized_candidate
        
        event = client.create_event(
            subject=schedule.name,
            start=candidate.start_at,
            end=candidate.end_at,
            body=f'日程調整ツールで確定された予定\n\n{schedule.description}',
            add_teams_meeting=True,
        )
        
        # Extract Teams meeting URL
        meeting_url = None
        online_meeting = event.get('onlineMeeting')
        if online_meeting:
            meeting_url = online_meeting.get('joinUrl')
        
        if meeting_url:
            logger.info(f'Teams meeting URL created: {meeting_url}')
            # RFC-0004: Save meeting URL to schedule
            if not schedule.meeting_url:  # Idempotency: don't overwrite existing
                schedule.meeting_url = meeting_url
                schedule.meeting_provider = 'teams'
                schedule.meeting_created_at = timezone.now()
                schedule.save(update_fields=['meeting_url', 'meeting_provider', 'meeting_created_at'])
        
        Notification.objects.create(
            schedule=schedule,
            notification_type='finalized',
            recipient_email=schedule.owner_email or schedule.owner_user.email,
            subject=f'Outlook Calendar登録完了: {schedule.name}',
            body=f'日程「{schedule.name}」がOutlookカレンダーに登録されました。\n\n'
                 f'日時: {candidate.start_at.strftime("%Y/%m/%d %H:%M")} - {candidate.end_at.strftime("%H:%M")}\n'
                 f'イベントID: {event.get("id")}\n'
                 f'{f"会議URL: {meeting_url}" if meeting_url else ""}',
            is_sent=True,
        )
        
        integration.mark_used()
        integration.clear_errors()
        
        logger.info(f'Successfully created Outlook event: {event.get("id")}')
        
        return {
            'event_id': event.get('id'),
            'meeting_url': meeting_url,
        }
        
    except OutlookCalendarError as e:
        logger.error(f'Failed to create Outlook event: {e}')
        integration.record_error(str(e))
        
        Notification.objects.create(
            schedule=schedule,
            notification_type='finalized',
            recipient_email=schedule.owner_email or schedule.owner_user.email,
            subject=f'Outlook Calendar登録失敗: {schedule.name}',
            body=f'日程「{schedule.name}」のOutlookカレンダー登録に失敗しました。\n\n'
                 f'エラー: {str(e)}',
            is_sent=False,
            error_message=str(e),
        )
        
        raise self.retry(exc=e)


def has_outlook_integration(user) -> bool:
    """Check if user has a valid Outlook integration"""
    from accounts.models import UserIntegration
    
    return UserIntegration.objects.filter(
        user=user,
        provider='outlook',
        is_active=True,
        revoked_at__isnull=True,
    ).exists()
