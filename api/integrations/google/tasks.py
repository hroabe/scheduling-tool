"""
Google Calendar Celery Tasks
RFC-0001: Googleカレンダー連携

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
def create_google_calendar_event(self, schedule_id: int):
    """
    Create Google Calendar event for finalized schedule
    
    Args:
        schedule_id: ID of the finalized Schedule
        
    This task is triggered after a schedule is finalized,
    if the owner has a valid Google Calendar integration.
    """
    from schedule.models import Schedule, Notification
    from accounts.models import UserIntegration
    from .client import (
        GoogleCalendarClient,
        GoogleCalendarError,
        refresh_access_token,
    )
    
    logger.info(f'Creating Google Calendar event for schedule {schedule_id}')
    
    # Get schedule
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
    
    # Get Google integration
    try:
        integration = UserIntegration.objects.get(
            user=schedule.owner_user,
            provider='google',
            is_active=True,
        )
    except UserIntegration.DoesNotExist:
        logger.info(f'No Google integration for user {schedule.owner_user.id}')
        return
    
    # Check and refresh token if needed
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
            integration.save()
        except GoogleCalendarError as e:
            logger.error(f'Token refresh failed for integration {integration.id}: {e}')
            integration.record_error(str(e))
            raise self.retry(exc=e)
    
    # Create calendar event
    try:
        client = GoogleCalendarClient(integration.get_access_token())
        
        candidate = schedule.finalized_candidate
        
        # Collect attendee emails (participants who responded OK or Maybe)
        attendees = []
        for participant in schedule.participants.all():
            # Check if participant has email (if we store it)
            # For now we skip attendees
            pass
        
        # Create event with Google Meet
        event = client.create_event(
            summary=schedule.name,
            start=candidate.start_at,
            end=candidate.end_at,
            description=f'日程調整ツールで確定された予定\n\n{schedule.description}',
            attendees=attendees if attendees else None,
            add_google_meet=True,
        )
        
        # Extract meeting URL if created
        meeting_url = event.get('hangoutLink')
        if meeting_url:
            logger.info(f'Google Meet URL created: {meeting_url}')
            # RFC-0004: Save meeting URL to schedule
            if not schedule.meeting_url:  # Idempotency: don't overwrite existing
                schedule.meeting_url = meeting_url
                schedule.meeting_provider = 'google_meet'
                schedule.meeting_created_at = timezone.now()
                schedule.save(update_fields=['meeting_url', 'meeting_provider', 'meeting_created_at'])
        
        # Log success
        Notification.objects.create(
            schedule=schedule,
            notification_type='finalized',
            recipient_email=schedule.owner_email or schedule.owner_user.email,
            subject=f'Google Calendar登録完了: {schedule.name}',
            body=f'日程「{schedule.name}」がGoogleカレンダーに登録されました。\n\n'
                 f'日時: {candidate.start_at.strftime("%Y/%m/%d %H:%M")} - {candidate.end_at.strftime("%H:%M")}\n'
                 f'イベントID: {event.get("id")}\n'
                 f'{f"会議URL: {meeting_url}" if meeting_url else ""}',
            is_sent=True,
        )
        
        integration.mark_used()
        integration.clear_errors()
        
        logger.info(f'Successfully created Google Calendar event: {event.get("id")}')
        
        return {
            'event_id': event.get('id'),
            'meeting_url': meeting_url,
        }
        
    except GoogleCalendarError as e:
        logger.error(f'Failed to create Google Calendar event: {e}')
        integration.record_error(str(e))
        
        # Log failure
        Notification.objects.create(
            schedule=schedule,
            notification_type='finalized',
            recipient_email=schedule.owner_email or schedule.owner_user.email,
            subject=f'Google Calendar登録失敗: {schedule.name}',
            body=f'日程「{schedule.name}」のGoogleカレンダー登録に失敗しました。\n\n'
                 f'エラー: {str(e)}',
            is_sent=False,
            error_message=str(e),
        )
        
        # Retry with exponential backoff
        raise self.retry(exc=e)


def has_google_integration(user) -> bool:
    """
    Check if user has a valid Google Calendar integration
    
    Args:
        user: Django User instance
        
    Returns:
        True if user has active Google integration
    """
    from accounts.models import UserIntegration
    
    return UserIntegration.objects.filter(
        user=user,
        provider='google',
        is_active=True,
        revoked_at__isnull=True,
    ).exists()
