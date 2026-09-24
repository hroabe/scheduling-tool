"""
Authentication tests added during the origin/main integration (docs/11_integration.md)
"""

from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .keycloak import KeycloakAuthentication, get_or_create_user


class LoginTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('taro', 'Taro@Example.com', 'pass-1234-word')

    def test_login_with_email_case_insensitive(self):
        client = APIClient()
        response = client.post('/api/v1/accounts/login/', {'username': 'taro@example.com', 'password': 'pass-1234-word'},
                               format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['user']['username'], 'taro')
        self.assertNotIn('token', response.json())
        self.assertEqual(client.get('/api/v1/accounts/me/').status_code, 200)

    def test_login_wrong_password(self):
        response = APIClient().post('/api/v1/accounts/login/', {'username': 'taro', 'password': 'nope'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_mobile_token_login_and_logout(self):
        client = APIClient()
        response = client.post('/api/v1/accounts/login/', {
            'username': 'taro', 'password': 'pass-1234-word', 'issue_token': True}, format='json')
        token = response.json()['token']
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(api.get('/api/v1/accounts/me/').json()['username'], 'taro')
        self.assertEqual(api.post('/api/v1/accounts/logout/', {}, format='json').status_code, 200)
        self.assertEqual(api.get('/api/v1/accounts/me/').status_code, 401)  # token revoked

    @override_settings(REST_FRAMEWORK={
        'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.SessionAuthentication'],
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {'login': '2/hour', 'anon': None, 'user': None, 'edit_key': None},
    })
    def test_login_is_throttled(self):
        from rest_framework.settings import api_settings
        from rest_framework.throttling import SimpleRateThrottle

        api_settings.reload()
        SimpleRateThrottle.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES
        try:
            codes = [APIClient().post('/api/v1/accounts/login/', {'username': 'taro', 'password': 'x'},
                                      format='json').status_code for _ in range(3)]
            self.assertEqual(codes[-1], 429)
        finally:
            api_settings.reload()
            SimpleRateThrottle.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES

    def test_register_rejects_duplicate_email_case_insensitive(self):
        response = APIClient().post('/api/v1/accounts/register/', {
            'username': 'other', 'email': 'TARO@example.com',
            'password': 'Another-pass-987', 'password_confirm': 'Another-pass-987'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.json())

    def test_me_patch_rejects_taken_email(self):
        User.objects.create_user('jiro', 'jiro@example.com', 'pass-1234-word')
        client = APIClient()
        client.force_authenticate(self.user)
        response = client.patch('/api/v1/accounts/me/', {'email': 'JIRO@example.com'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_csrf_endpoint_sets_cookie(self):
        response = APIClient().get('/api/v1/accounts/csrf/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('csrftoken', response.cookies)

    def test_session_requests_enforce_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        client.login(username='taro', password='pass-1234-word')
        response = client.patch('/api/v1/accounts/me/', {'first_name': 'x'}, format='json')
        self.assertEqual(response.status_code, 403)
        client.get('/api/v1/accounts/csrf/')
        token = client.cookies['csrftoken'].value
        response = client.patch('/api/v1/accounts/me/', {'first_name': 'x'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)


@override_settings(KEYCLOAK_URL='http://keycloak:8080/keycloak', KEYCLOAK_REALM='scheduling-tool')
class KeycloakTests(TestCase):
    def setUp(self):
        cache.clear()

    def _request(self, token='abc'):
        request = mock.Mock()
        request.META = {'HTTP_AUTHORIZATION': f'Bearer {token}'}
        return request

    def _userinfo(self, status_code=200, claims=None):
        response = mock.Mock(status_code=status_code)
        response.json.return_value = claims or {}
        return response

    def test_valid_token_creates_and_caches_user(self):
        claims = {'sub': 'abc-123', 'email': 'kc@example.com', 'email_verified': True, 'given_name': '花子'}
        with mock.patch('accounts.keycloak.requests.get', return_value=self._userinfo(200, claims)) as get:
            user, _ = KeycloakAuthentication().authenticate(self._request())
            KeycloakAuthentication().authenticate(self._request())
        self.assertEqual(get.call_count, 1)  # cached
        self.assertEqual(user.username, 'kc_abc-123')
        self.assertEqual(user.email, 'kc@example.com')
        self.assertEqual(user.first_name, '花子')
        self.assertFalse(user.has_usable_password())

    def test_verified_email_links_existing_account(self):
        existing = User.objects.create_user('taro', 'taro@example.com', 'pass-1234-word')
        user = get_or_create_user({'sub': 'x1', 'email': 'TARO@example.com', 'email_verified': True})
        self.assertEqual(user, existing)

    def test_unverified_email_does_not_link(self):
        existing = User.objects.create_user('taro', 'taro@example.com', 'pass-1234-word')
        user = get_or_create_user({'sub': 'x2', 'email': 'taro@example.com', 'email_verified': False})
        self.assertNotEqual(user, existing)

    def test_invalid_token_rejected(self):
        from rest_framework.exceptions import AuthenticationFailed

        with mock.patch('accounts.keycloak.requests.get', return_value=self._userinfo(401)):
            with self.assertRaises(AuthenticationFailed):
                KeycloakAuthentication().authenticate(self._request('bad'))

    def test_non_bearer_header_ignored(self):
        request = mock.Mock()
        request.META = {'HTTP_AUTHORIZATION': 'Token xyz'}
        self.assertIsNone(KeycloakAuthentication().authenticate(request))
