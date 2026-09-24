"""
Google Calendar Integration Views
RFC-0001: Googleカレンダー連携

OAuth endpoints for connecting, callback, and freeBusy query.
"""

import secrets
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from accounts.models import UserIntegration
from .client import (
    get_oauth_url,
    exchange_code_for_tokens,
    refresh_access_token,
    GoogleCalendarClient,
    GoogleCalendarError,
    GOOGLE_SCOPES,
)

from integrations.oauth import create_state, handle_callback

logger = logging.getLogger(__name__)


class GoogleConnectView(APIView):
    """
    Google OAuth接続開始

    POST /api/v1/integrations/google/connect/

    Returns OAuth authorization URL for user to visit.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Generate state for CSRF protection
        if not settings.GOOGLE_CLIENT_ID:
            return Response(
                {'error': 'not_configured', 'detail': 'このサーバーではカレンダー連携が設定されていません。'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        state = create_state(request.user, 'google')

        # Generate OAuth URL
        try:
            auth_url = get_oauth_url(state)
        except Exception as e:
            logger.error(f'Failed to generate OAuth URL: {e}')
            return Response(
                {'error': 'OAuth URL の生成に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'auth_url': auth_url,
            'message': 'このURLにアクセスしてGoogleアカウントを連携してください'
        })


class GoogleCallbackView(APIView):
    """
    OAuth コールバック（プロバイダーからブラウザがリダイレクトされる）

    GET /api/v1/integrations/google/callback/?code=...&state=...

    state からユーザーを特定してトークンを保存し、フロントエンドの
    /account/integrations?provider=google&status=connected|error にリダイレクトする。
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return handle_callback(request, 'google', exchange_code_for_tokens, GOOGLE_SCOPES, GoogleCalendarError)


class GoogleDisconnectView(APIView):
    """
    Google連携解除

    POST /api/v1/integrations/google/disconnect/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            integration = UserIntegration.objects.get(
                user=request.user,
                provider='google',
            )
            integration.revoke()
            return Response({'message': 'Google連携を解除しました'})
        except UserIntegration.DoesNotExist:
            return Response(
                {'error': 'Google連携が見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )


class GoogleFreeBusyView(APIView):
    """
    空き時間取得

    GET /api/v1/integrations/google/freebusy/?start=...&end=...

    Returns busy periods from user's Google Calendar.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start = request.query_params.get('start')
        end = request.query_params.get('end')

        if not start or not end:
            return Response(
                {'error': 'start と end パラメータが必要です'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get user's Google integration
        try:
            integration = UserIntegration.objects.get(
                user=request.user,
                provider='google',
                is_active=True,
            )
        except UserIntegration.DoesNotExist:
            return Response(
                {'error': 'Google連携が設定されていません'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if token needs refresh
        if integration.is_expired:
            try:
                refresh_token = integration.get_refresh_token()
                if not refresh_token:
                    integration.revoke()
                    return Response(
                        {'error': 'トークンが期限切れです。再連携が必要です'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )

                new_tokens = refresh_access_token(refresh_token)
                integration.set_access_token(new_tokens['access_token'])
                integration.expires_at = timezone.now() + timedelta(
                    seconds=new_tokens.get('expires_in', 3600)
                )
                integration.save()
            except GoogleCalendarError as e:
                logger.error(f'Token refresh failed: {e}')
                integration.record_error(str(e))
                return Response(
                    {'error': 'トークン更新に失敗しました。再連携が必要です'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # Query freebusy
        try:
            from datetime import datetime
            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))

            client = GoogleCalendarClient(integration.get_access_token())
            busy_periods = client.get_freebusy(start_dt, end_dt)

            integration.mark_used()
            integration.clear_errors()

            return Response({
                'busy': busy_periods,
            })
        except GoogleCalendarError as e:
            logger.error(f'FreeBusy query failed: {e}')
            integration.record_error(str(e))
            return Response(
                {'error': '空き時間の取得に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except ValueError as e:
            return Response(
                {'error': f'日時の形式が不正です: {e}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class GoogleStatusView(APIView):
    """
    Google連携状態確認

    GET /api/v1/integrations/google/status/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            integration = UserIntegration.objects.get(
                user=request.user,
                provider='google',
            )
            return Response({
                'configured': bool(settings.GOOGLE_CLIENT_ID),
                'connected': integration.is_active and not integration.revoked_at,
                'is_valid': integration.is_valid,
                'is_expired': integration.is_expired,
                'expires_at': integration.expires_at,
                'last_used_at': integration.last_used_at,
                'error_count': integration.error_count,
            })
        except UserIntegration.DoesNotExist:
            return Response({
                'configured': bool(settings.GOOGLE_CLIENT_ID),
                'connected': False,
            })
