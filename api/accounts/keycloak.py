"""
Keycloak OIDC Authentication Backend
RFC-0011: Keycloak認証統合

Bearer access tokens issued by Keycloak are validated against the realm's
userinfo endpoint (the token is only accepted if Keycloak itself vouches for it).
Successful validations are cached briefly so Keycloak is not hit on every request.

Enabled only when settings.KEYCLOAK_URL is set (see api/settings.py).
"""

import hashlib
import logging
from typing import Any, Dict, Optional

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import IntegrityError, transaction
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)

USERINFO_CACHE_SECONDS = 60


class KeycloakConfig:
    """Keycloak configuration (read from Django settings)"""

    @property
    def url(self) -> str:
        return settings.KEYCLOAK_URL.rstrip('/')

    @property
    def realm(self) -> str:
        return settings.KEYCLOAK_REALM

    @property
    def realm_url(self) -> str:
        return f"{self.url}/realms/{self.realm}"

    @property
    def userinfo_url(self) -> str:
        return f"{self.realm_url}/protocol/openid-connect/userinfo"


keycloak_config = KeycloakConfig()


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Validate an access token with Keycloak and return its claims (cached briefly)."""
    cache_key = 'kc:userinfo:' + hashlib.sha256(token.encode()).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached or None

    try:
        response = requests.get(
            keycloak_config.userinfo_url,
            headers={'Authorization': f'Bearer {token}'},
            timeout=settings.EXTERNAL_API_TIMEOUT,
        )
    except requests.RequestException as exc:
        logger.error('Keycloak userinfo request failed: %s', exc.__class__.__name__)
        return None

    claims = response.json() if response.status_code == 200 else None
    # Cache negative results for a shorter period
    cache.set(cache_key, claims or {}, USERINFO_CACHE_SECONDS if claims else 10)
    return claims


def get_or_create_user(claims: Dict[str, Any]) -> User:
    """
    Map Keycloak claims to a Django user.

    Matching order: username == "kc_<sub>" -> verified e-mail -> create a new user.
    """
    sub = claims.get('sub')
    if not sub:
        raise AuthenticationFailed('Token has no subject')

    username = f'kc_{sub}'[:150]
    email = (claims.get('email') or '').strip()
    email_verified = bool(claims.get('email_verified'))

    user = User.objects.filter(username=username).first()
    if user is None and email and email_verified:
        user = User.objects.filter(email__iexact=email).order_by('id').first()

    if user is None:
        try:
            with transaction.atomic():
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=claims.get('given_name', '')[:150],
                    last_name=claims.get('family_name', '')[:150],
                )
                user.set_unusable_password()
                user.save(update_fields=['password'])
        except IntegrityError:
            user = User.objects.get(username=username)

    updates = {}
    if email and email_verified and user.email != email:
        updates['email'] = email
    for claim, field in (('given_name', 'first_name'), ('family_name', 'last_name')):
        value = claims.get(claim)
        if value and getattr(user, field) != value:
            updates[field] = value[:150]
    if updates:
        for field, value in updates.items():
            setattr(user, field, value)
        user.save(update_fields=list(updates))

    return user


class KeycloakAuthentication(BaseAuthentication):
    """DRF authentication for `Authorization: Bearer <keycloak access token>`."""

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header[7:].strip()
        if not token:
            return None

        claims = verify_token(token)
        if not claims:
            raise AuthenticationFailed('Invalid or expired token')

        user = get_or_create_user(claims)
        if not user.is_active:
            raise AuthenticationFailed('User inactive')
        return (user, claims)

    def authenticate_header(self, request):
        return f'Bearer realm="{settings.KEYCLOAK_REALM}"'
