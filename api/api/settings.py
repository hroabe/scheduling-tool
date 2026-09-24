"""
Django settings for api project.

Django 5.2 LTS. All environment-specific values are read from environment
variables (or api/.env) via python-decouple.

Optional infrastructure (docs/11_integration.md):
- REDIS_URL unset  -> Celery tasks run synchronously in-process, LocMem cache
- REDIS_URL set    -> Celery worker/beat via Redis, shared Redis cache
- KEYCLOAK_URL set -> Keycloak (OIDC) bearer tokens are accepted in addition to sessions/API tokens
"""

from pathlib import Path

import dj_database_url
from decouple import Csv, config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production')

if not DEBUG and (not SECRET_KEY or SECRET_KEY.startswith('django-insecure')):
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured('SECRET_KEY must be set when DEBUG=False.')

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'drf_spectacular',
    # Local apps
    'schedule',
    'accounts',
    'integrations.google',
    'integrations.outlook',
    'oneonone',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'api.wsgi.application'


# Database
# SQLite for local development, PostgreSQL (DATABASE_URL) for production

DATABASE_URL = config('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}')

DATABASES = {
    'default': dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=config('DB_CONN_MAX_AGE', default=600, cast=int),
        conn_health_checks=True,
    )
}


# Authentication

AUTHENTICATION_BACKENDS = [
    # Accept either the username or the (case-insensitive) e-mail address
    'accounts.backends.EmailOrUsernameBackend',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# Internationalization

LANGUAGE_CODE = 'ja'

LANGUAGES = [
    ('ja', '日本語'),
    ('en', 'English'),
    ('zh', '中文'),
    ('ko', '한국어'),
    ('es', 'Español'),
    ('fr', 'Français'),
    ('de', 'Deutsch'),
    ('pt', 'Português'),
]

LOCALE_PATHS = [BASE_DIR / 'locale']

TIME_ZONE = config('DEFAULT_TIMEZONE', default='Asia/Tokyo')

USE_I18N = True

USE_TZ = True


# Static files (Django admin / API docs assets served by WhiteNoise)

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Keycloak (RFC-0011) - optional
KEYCLOAK_URL = config('KEYCLOAK_URL', default='')
KEYCLOAK_PUBLIC_URL = config('KEYCLOAK_PUBLIC_URL', default=KEYCLOAK_URL)
KEYCLOAK_REALM = config('KEYCLOAK_REALM', default='scheduling-tool')
KEYCLOAK_CLIENT_ID = config('KEYCLOAK_CLIENT_ID', default='scheduling-backend')
KEYCLOAK_CLIENT_SECRET = config('KEYCLOAK_CLIENT_SECRET', default='')


# Django REST Framework
# Token first: an explicit Authorization header wins over a stray session cookie, and an
# invalid token yields 401 (with WWW-Authenticate) instead of a CSRF-flavoured 403.
_AUTHENTICATION_CLASSES = [
    'rest_framework.authentication.TokenAuthentication',
    'rest_framework.authentication.SessionAuthentication',
]
if KEYCLOAK_URL:
    _AUTHENTICATION_CLASSES.insert(0, 'accounts.keycloak.KeycloakAuthentication')

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': _AUTHENTICATION_CLASSES,
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'schedule.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('THROTTLE_ANON_RATE', default='100/hour'),
        'user': config('THROTTLE_USER_RATE', default='1000/hour'),
        # 編集キー・ホストトークン・ログインの総当たり対策
        'edit_key': config('THROTTLE_EDIT_KEY_RATE', default='30/hour'),
        'login': config('THROTTLE_LOGIN_RATE', default='20/hour'),
    },
    # Number of trusted reverse proxies in front of the API (for client IP detection)
    'NUM_PROXIES': config('NUM_PROXIES', default=None, cast=lambda v: int(v) if v not in (None, '') else None),
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S%z',
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
}

if DEBUG:
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'].append(
        'rest_framework.renderers.BrowsableAPIRenderer'
    )

# Shared secret that lets the Next.js server (SSR metadata) bypass anon throttling
INTERNAL_API_TOKEN = config('INTERNAL_API_TOKEN', default='')


# DRF Spectacular (API Documentation)
SPECTACULAR_SETTINGS = {
    'TITLE': '日程調整ツール API',
    'DESCRIPTION': '登録不要の日程調整・1on1予約ツールのRESTful API',
    'VERSION': '3.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}


# CORS / CSRF
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    # 8081: Expo web preview of the mobile app
    default='http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081',
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = (
    'accept',
    'authorization',
    'content-type',
    'x-csrftoken',
    'x-edit-key',
    'x-edit-token',
    'x-host-token',
    'x-cancel-token',
    'x-requested-with',
)
CORS_EXPOSE_HEADERS = ('content-disposition',)

# Browsers send an Origin header on unsafe requests; trust the frontend origins by default
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default=','.join(CORS_ALLOWED_ORIGINS), cast=Csv())
# The SPA reads the CSRF cookie and echoes it in X-CSRFToken
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000').rstrip('/')

ADMIN_URL = config('DJANGO_ADMIN_URL', default='admin/')


# Security Settings (production)
if not DEBUG:
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SECURE_REDIRECT_EXEMPT = [r'^api/health/$']
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True


# Cache / Celery (Redis is optional)
REDIS_URL = config('REDIS_URL', default='')

if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
        }
    }
    CELERY_BROKER_URL = REDIS_URL
    CELERY_RESULT_BACKEND = REDIS_URL
    CELERY_TASK_ALWAYS_EAGER = False
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'scheduling-tool',
        }
    }
    # No broker: tasks run synchronously inside the request (see schedule.async_tasks.enqueue)
    CELERY_BROKER_URL = 'memory://'
    CELERY_RESULT_BACKEND = None
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = False

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_IGNORE_RESULT = True


# Encryption key for OAuth tokens at rest.
# If FERNET_KEY is not provided it is derived from SECRET_KEY (see accounts.models.get_fernet).
FERNET_KEY = config('FERNET_KEY', default='')


# Google OAuth (RFC-0001)
GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET = config('GOOGLE_CLIENT_SECRET', default='')
GOOGLE_REDIRECT_URI = config('GOOGLE_REDIRECT_URI', default='http://localhost:8000/api/v1/integrations/google/callback/')

# Microsoft OAuth (RFC-0002)
MICROSOFT_CLIENT_ID = config('MICROSOFT_CLIENT_ID', default='')
MICROSOFT_CLIENT_SECRET = config('MICROSOFT_CLIENT_SECRET', default='')
MICROSOFT_REDIRECT_URI = config('MICROSOFT_REDIRECT_URI', default='http://localhost:8000/api/v1/integrations/outlook/callback/')

# Outbound HTTP timeout (seconds) for OAuth / calendar APIs
EXTERNAL_API_TIMEOUT = config('EXTERNAL_API_TIMEOUT', default=10, cast=int)


# Email Configuration (console backend by default)
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@scheduling-tool.example')
EMAIL_TIMEOUT = 10


# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {
            'format': '{levelname} {asctime} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'schedule': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}
