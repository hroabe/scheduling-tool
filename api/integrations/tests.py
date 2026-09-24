"""
Tests for calendar integrations (RFC-0001 / RFC-0002) with mocked HTTP calls.
"""

from datetime import timedelta
from unittest import mock
from urllib.parse import parse_qs, urlparse

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import UserIntegration
from schedule.models import Candidate, Notification, Schedule

PROVIDERS = {
    'google': {'setting': 'GOOGLE_CLIENT_ID', 'client': 'integrations.google.client'},
    'outlook': {'setting': 'MICROSOFT_CLIENT_ID', 'client': 'integrations.outlook.client'},
}


def fake_token_response(*args, **kwargs):
    response = mock.Mock(status_code=200)
    response.json.return_value = {'access_token': 'access-123', 'refresh_token': 'refresh-456', 'expires_in': 3600}
    response.raise_for_status.return_value = None
    return response


@override_settings(
    GOOGLE_CLIENT_ID='gid', GOOGLE_CLIENT_SECRET='gsecret',
    MICROSOFT_CLIENT_ID='mid', MICROSOFT_CLIENT_SECRET='msecret',
    FRONTEND_URL='https://app.example.com',
)
class OAuthFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('u', 'u@example.com', 'pass-1234-word')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _connect(self, provider):
        response = self.client.post(f'/api/v1/integrations/{provider}/connect/', {}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        return parse_qs(urlparse(response.json()['auth_url']).query)['state'][0]

    def test_full_oauth_flow_redirects_to_frontend(self):
        for provider, cfg in PROVIDERS.items():
            with self.subTest(provider=provider):
                state = self._connect(provider)
                anonymous = APIClient()  # the browser comes back without API auth headers
                with mock.patch(f"{cfg['client']}.requests.post", side_effect=fake_token_response) as post:
                    response = anonymous.get(f'/api/v1/integrations/{provider}/callback/',
                                             {'code': 'abc', 'state': state})
                self.assertEqual(response.status_code, 302)
                self.assertEqual(
                    response['Location'],
                    f'https://app.example.com/account/integrations?provider={provider}&status=connected',
                )
                self.assertIn('timeout', post.call_args.kwargs)
                integration = UserIntegration.objects.get(user=self.user, provider=provider)
                self.assertEqual(integration.get_access_token(), 'access-123')
                self.assertNotIn('access-123', integration._access_token_encrypted)  # encrypted at rest

                # state is single-use
                replay = anonymous.get(f'/api/v1/integrations/{provider}/callback/', {'code': 'abc', 'state': state})
                self.assertIn('status=error', replay['Location'])

    def test_invalid_state_and_denied(self):
        for provider in PROVIDERS:
            response = APIClient().get(f'/api/v1/integrations/{provider}/callback/', {'code': 'x', 'state': 'bogus'})
            self.assertIn('reason=state', response['Location'])
            response = APIClient().get(f'/api/v1/integrations/{provider}/callback/', {'error': 'access_denied'})
            self.assertIn('reason=denied', response['Location'])

    @override_settings(GOOGLE_CLIENT_ID='', MICROSOFT_CLIENT_ID='')
    def test_not_configured(self):
        for provider in PROVIDERS:
            response = self.client.post(f'/api/v1/integrations/{provider}/connect/', {}, format='json')
            self.assertEqual(response.status_code, 503)
            status = self.client.get(f'/api/v1/integrations/{provider}/status/').json()
            self.assertEqual(status, {'configured': False, 'connected': False})

    def test_connect_requires_login(self):
        response = APIClient().post('/api/v1/integrations/google/connect/', {}, format='json')
        self.assertIn(response.status_code, (401, 403))


class FinalizeCreatesCalendarEventTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('owner', 'owner@example.com', 'pass-1234-word')
        self.schedule = Schedule.objects.create(name='定例', owner_name='owner', owner_user=self.user)
        self.schedule.set_edit_key('secret123')
        self.schedule.save()
        start = timezone.now() + timedelta(days=3)
        self.candidate = Candidate.objects.create(schedule=self.schedule, start_at=start, end_at=start + timedelta(hours=1))
        integration = UserIntegration.objects.create(
            user=self.user, provider='google', is_active=True,
            expires_at=timezone.now() + timedelta(hours=1),
        )
        integration.set_access_token('tok')
        integration.save()

    def test_finalize_creates_google_event_once_and_saves_meet_url(self):
        client = APIClient()
        with mock.patch('integrations.google.client.GoogleCalendarClient.create_event',
                        return_value={'id': 'ev1', 'hangoutLink': 'https://meet.google.com/abc-defg-hij'}) as create:
            with self.captureOnCommitCallbacks(execute=True):
                response = client.post(f'/api/v1/schedules/{self.schedule.uuid}/finalize/',
                                       {'candidate_id': self.candidate.id}, format='json',
                                       HTTP_X_EDIT_KEY='secret123')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(create.call_count, 1)

            # task retried / re-dispatched for the same finalization -> no duplicate event
            from integrations.google.tasks import create_google_calendar_event
            create_google_calendar_event.apply(args=[self.schedule.id])
            self.assertEqual(create.call_count, 1)

        self.schedule.refresh_from_db()
        self.assertEqual(self.schedule.meeting_url, 'https://meet.google.com/abc-defg-hij')
        self.assertEqual(self.schedule.meeting_provider, 'google_meet')
        detail = client.get(f'/api/v1/schedules/{self.schedule.uuid}/').json()
        self.assertEqual(detail['meeting_url'], 'https://meet.google.com/abc-defg-hij')
        self.assertTrue(Notification.objects.filter(schedule=self.schedule, is_sent=True).exists())

        ics = client.get(f'/api/v1/schedules/{self.schedule.uuid}/export_ics/').content.decode()
        self.assertIn('LOCATION:https://meet.google.com/abc-defg-hij', ics.replace('\r\n ', ''))
