"""
Shared OAuth helpers for calendar integrations (RFC-0001 / RFC-0002)

- The OAuth `state` is stored server-side (cache: state -> user id, 10 minutes), so
  the flow works for session, API-token and Keycloak-bearer users alike.
- The provider redirects the browser to the API callback, which stores the tokens
  and then redirects back to the frontend settings page with a status query.
"""

import logging
import secrets
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.http import HttpResponseRedirect
from django.utils import timezone

logger = logging.getLogger(__name__)

STATE_TTL_SECONDS = 600


def create_state(user, provider: str) -> str:
    state = secrets.token_urlsafe(32)
    cache.set(f'oauth_state:{provider}:{state}', user.pk, STATE_TTL_SECONDS)
    return state


def pop_state_user(state: str, provider: str):
    if not state:
        return None
    key = f'oauth_state:{provider}:{state}'
    user_id = cache.get(key)
    if user_id is None:
        return None
    cache.delete(key)
    return User.objects.filter(pk=user_id, is_active=True).first()


def frontend_redirect(provider: str, status: str, reason: str = '') -> HttpResponseRedirect:
    query = {'provider': provider, 'status': status}
    if reason:
        query['reason'] = reason
    return HttpResponseRedirect(f"{settings.FRONTEND_URL}/account/integrations?{urlencode(query)}")


def handle_callback(request, provider: str, exchange_code, scopes, error_class):
    """Common OAuth callback: validate state, exchange the code, save the integration, redirect."""
    from accounts.models import UserIntegration

    if request.query_params.get('error'):
        logger.warning('OAuth error from %s: %s', provider, request.query_params.get('error'))
        return frontend_redirect(provider, 'error', 'denied')

    user = pop_state_user(request.query_params.get('state'), provider)
    if user is None:
        logger.warning('OAuth state mismatch for %s', provider)
        return frontend_redirect(provider, 'error', 'state')

    code = request.query_params.get('code')
    if not code:
        return frontend_redirect(provider, 'error', 'code')

    try:
        tokens = exchange_code(code)
    except error_class as exc:
        logger.error('Token exchange failed for %s: %s', provider, exc)
        return frontend_redirect(provider, 'error', 'token')

    integration, created = UserIntegration.objects.update_or_create(
        user=user,
        provider=provider,
        defaults={
            'expires_at': timezone.now() + timedelta(seconds=tokens.get('expires_in', 3600)),
            'scopes': ' '.join(scopes),
            'is_active': True,
            'revoked_at': None,
            'last_error': None,
            'error_count': 0,
        },
    )
    integration.set_access_token(tokens['access_token'])
    if tokens.get('refresh_token'):
        integration.set_refresh_token(tokens['refresh_token'])
    integration.save()
    logger.info('%s integration %s for user %s', provider, 'created' if created else 'updated', user.pk)
    return frontend_redirect(provider, 'connected')


def already_registered(schedule, provider_label: str) -> bool:
    """
    Idempotency guard for calendar-event tasks: True if an event for the current
    finalization has already been created successfully (avoids duplicates on retry).
    """
    from schedule.models import Notification

    qs = Notification.objects.filter(
        schedule=schedule,
        notification_type='finalized',
        is_sent=True,
        subject__startswith=f'{provider_label}登録完了',
    )
    if schedule.finalized_at:
        qs = qs.filter(sent_at__gte=schedule.finalized_at)
    return qs.exists()
