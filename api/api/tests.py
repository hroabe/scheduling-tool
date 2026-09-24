"""
Tests for Django settings configuration.

Settings are evaluated at import time, so production behaviour is verified by
loading the settings module in a fresh subprocess with a controlled environment.
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from unittest import TestCase

API_DIR = Path(__file__).resolve().parent.parent

PROBE = """
import json, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
from django.conf import settings
print(json.dumps({
    'nosniff': settings.SECURE_CONTENT_TYPE_NOSNIFF,
    'frame': settings.X_FRAME_OPTIONS,
    'hsts': settings.SECURE_HSTS_SECONDS,
    'session_secure': settings.SESSION_COOKIE_SECURE,
    'csrf_secure': settings.CSRF_COOKIE_SECURE,
    'ssl_redirect': settings.SECURE_SSL_REDIRECT,
    'eager': settings.CELERY_TASK_ALWAYS_EAGER,
    'cache': settings.CACHES['default']['BACKEND'],
    'auth': settings.REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'],
}))
"""


def load_settings(**env):
    base = {k: v for k, v in os.environ.items() if k not in {
        'SECRET_KEY', 'DEBUG', 'REDIS_URL', 'KEYCLOAK_URL', 'DATABASE_URL'}}
    base.update(env)
    # Avoid picking up api/.env values for keys we control explicitly
    for key in ('SECRET_KEY', 'DEBUG', 'REDIS_URL', 'KEYCLOAK_URL'):
        base.setdefault(key, '')
    return subprocess.run(
        [sys.executable, '-c', PROBE], cwd=API_DIR, env=base,
        capture_output=True, text=True, timeout=60,
    )


class SettingsSecurityTests(TestCase):
    """Test security-related settings configuration."""

    def test_secret_key_required_when_debug_false(self):
        result = load_settings(DEBUG='False', SECRET_KEY='')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('SECRET_KEY must be set', result.stderr)

    def test_production_security_settings(self):
        result = load_settings(DEBUG='False', SECRET_KEY='prod-test-key-0123456789abcdefghijklmnopqrstuvwxyz')
        self.assertEqual(result.returncode, 0, result.stderr)
        values = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertTrue(values['nosniff'])
        self.assertEqual(values['frame'], 'DENY')
        self.assertGreater(values['hsts'], 0)
        self.assertTrue(values['session_secure'])
        self.assertTrue(values['csrf_secure'])
        self.assertTrue(values['ssl_redirect'])

    def test_redis_is_optional(self):
        result = load_settings(DEBUG='True', SECRET_KEY='x', REDIS_URL='')
        values = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertTrue(values['eager'])
        self.assertIn('LocMemCache', values['cache'])

        result = load_settings(DEBUG='True', SECRET_KEY='x', REDIS_URL='redis://redis:6379/0')
        values = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertFalse(values['eager'])
        self.assertIn('RedisCache', values['cache'])

    def test_keycloak_authentication_enabled_by_env(self):
        without = json.loads(load_settings(DEBUG='True', SECRET_KEY='x').stdout.strip().splitlines()[-1])
        self.assertNotIn('accounts.keycloak.KeycloakAuthentication', without['auth'])
        with_kc = json.loads(load_settings(
            DEBUG='True', SECRET_KEY='x', KEYCLOAK_URL='http://keycloak:8080/keycloak',
        ).stdout.strip().splitlines()[-1])
        self.assertEqual(with_kc['auth'][0], 'accounts.keycloak.KeycloakAuthentication')
