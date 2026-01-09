"""
Keycloak OIDC Authentication Backend
RFC-0011: Keycloak認証統合

This module provides JWT token verification for Keycloak OIDC tokens.
"""

import os
import json
import logging
from functools import lru_cache
from typing import Optional, Dict, Any

import requests
from django.contrib.auth.models import User
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)


class KeycloakConfig:
    """Keycloak configuration from environment variables"""
    
    @property
    def url(self) -> str:
        return os.environ.get('KEYCLOAK_URL', 'http://keycloak:8080/auth')
    
    @property
    def realm(self) -> str:
        return os.environ.get('KEYCLOAK_REALM', 'scheduling-tool')
    
    @property
    def client_id(self) -> str:
        return os.environ.get('KEYCLOAK_CLIENT_ID', 'scheduling-backend')
    
    @property
    def client_secret(self) -> Optional[str]:
        return os.environ.get('KEYCLOAK_CLIENT_SECRET')
    
    @property
    def realm_url(self) -> str:
        return f"{self.url}/realms/{self.realm}"
    
    @property
    def jwks_url(self) -> str:
        return f"{self.realm_url}/protocol/openid-connect/certs"
    
    @property
    def userinfo_url(self) -> str:
        return f"{self.realm_url}/protocol/openid-connect/userinfo"


keycloak_config = KeycloakConfig()


@lru_cache(maxsize=1)
def get_keycloak_public_keys() -> Dict[str, Any]:
    """
    Fetch and cache Keycloak public keys for token verification.
    """
    try:
        response = requests.get(keycloak_config.jwks_url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch Keycloak public keys: {e}")
        return {}


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a Keycloak access token and return the claims.
    
    For simplicity, we use the userinfo endpoint instead of local JWT verification.
    In production, consider using python-jose for local verification.
    """
    try:
        response = requests.get(
            keycloak_config.userinfo_url,
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        
        return None
    except requests.RequestException as e:
        logger.error(f"Token verification failed: {e}")
        return None


def get_or_create_user(claims: Dict[str, Any]) -> User:
    """
    Get or create a Django User from Keycloak token claims.
    """
    keycloak_id = claims.get('sub')
    username = claims.get('preferred_username', keycloak_id)
    email = claims.get('email', '')
    
    # Try to find user by username
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'email': email,
            'first_name': claims.get('given_name', ''),
            'last_name': claims.get('family_name', ''),
        }
    )
    
    if not created:
        # Update user info from Keycloak
        updated = False
        if email and user.email != email:
            user.email = email
            updated = True
        if claims.get('given_name') and user.first_name != claims.get('given_name'):
            user.first_name = claims.get('given_name', '')
            updated = True
        if claims.get('family_name') and user.last_name != claims.get('family_name'):
            user.last_name = claims.get('family_name', '')
            updated = True
        if updated:
            user.save()
    
    return user


class KeycloakAuthentication(BaseAuthentication):
    """
    DRF Authentication backend for Keycloak OIDC tokens.
    
    Extracts Bearer token from Authorization header,
    verifies it with Keycloak, and returns the corresponding Django User.
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        if not token:
            return None
        
        claims = verify_token(token)
        
        if not claims:
            raise AuthenticationFailed('Invalid or expired token')
        
        user = get_or_create_user(claims)
        
        return (user, claims)
    
    def authenticate_header(self, request):
        return 'Bearer realm="scheduling-tool"'
