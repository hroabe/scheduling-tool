"""
Throttling classes for the Schedule API
"""

import hmac

from django.conf import settings
from rest_framework import throttling


def _is_internal_request(request):
    """Next.jsサーバー（SSRのメタデータ取得）からの内部リクエストか"""
    token = settings.INTERNAL_API_TOKEN
    provided = request.headers.get('X-Internal-Token', '')
    return bool(token) and hmac.compare_digest(token, provided)


class AnonRateThrottle(throttling.AnonRateThrottle):
    """匿名ユーザー向けレート制限（内部リクエストは除外）"""

    def allow_request(self, request, view):
        if _is_internal_request(request):
            return True
        return super().allow_request(request, view)


class EditKeyRateThrottle(throttling.SimpleRateThrottle):
    """編集キー検証の総当たり対策（IPアドレス単位）"""

    scope = 'edit_key'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }
