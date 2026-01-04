"""
Outlook Calendar Integration Views
RFC-0002: Outlookカレンダー連携

OAuth endpoints for connecting, callback, and calendarView query.
"""

import secrets
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.models import UserIntegration
from .client import (
    get_oauth_url,
    exchange_code_for_tokens,
    refresh_access_token,
    OutlookCalendarClient,
    OutlookCalendarError,
    MS_SCOPES,
)

logger = logging.getLogger(__name__)


class OutlookConnectView(APIView):
    """
    Outlook OAuth接続開始
    
    POST /api/v1/integrations/outlook/connect/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        state = secrets.token_urlsafe(32)
        request.session['outlook_oauth_state'] = state
        
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
            'message': 'このURLにアクセスしてMicrosoftアカウントを連携してください'
        })


class OutlookCallbackView(APIView):
    """
    Outlook OAuth コールバック
    
    GET /api/v1/integrations/outlook/callback/?code=...&state=...
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        code = request.query_params.get('code')
        state = request.query_params.get('state')
        error = request.query_params.get('error')
        
        if error:
            logger.warning(f'OAuth error: {error}')
            return Response(
                {'error': f'認証エラー: {error}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not code:
            return Response(
                {'error': '認証コードがありません'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stored_state = request.session.get('outlook_oauth_state')
        if not stored_state or state != stored_state:
            logger.warning('OAuth state mismatch')
            return Response(
                {'error': '無効なリクエストです（state不一致）'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        del request.session['outlook_oauth_state']
        
        try:
            tokens = exchange_code_for_tokens(code)
        except OutlookCalendarError as e:
            logger.error(f'Token exchange failed: {e}')
            return Response(
                {'error': 'トークンの取得に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        expires_in = tokens.get('expires_in', 3600)
        expires_at = timezone.now() + timedelta(seconds=expires_in)
        
        integration, created = UserIntegration.objects.update_or_create(
            user=request.user,
            provider='outlook',
            defaults={
                'expires_at': expires_at,
                'scopes': ' '.join(MS_SCOPES),
                'is_active': True,
                'revoked_at': None,
                'last_error': None,
                'error_count': 0,
            }
        )
        
        integration.set_access_token(tokens['access_token'])
        if tokens.get('refresh_token'):
            integration.set_refresh_token(tokens['refresh_token'])
        integration.save()
        
        logger.info(f'Outlook integration {"created" if created else "updated"} for user {request.user.id}')
        
        return Response({
            'message': 'Outlook連携が完了しました',
            'integration_id': integration.id,
        })


class OutlookDisconnectView(APIView):
    """
    Outlook連携解除
    
    POST /api/v1/integrations/outlook/disconnect/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            integration = UserIntegration.objects.get(
                user=request.user,
                provider='outlook',
            )
            integration.revoke()
            return Response({'message': 'Outlook連携を解除しました'})
        except UserIntegration.DoesNotExist:
            return Response(
                {'error': 'Outlook連携が見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )


class OutlookCalendarView(APIView):
    """
    カレンダー予定取得
    
    GET /api/v1/integrations/outlook/calendarView/?start=...&end=...
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
        
        try:
            integration = UserIntegration.objects.get(
                user=request.user,
                provider='outlook',
                is_active=True,
            )
        except UserIntegration.DoesNotExist:
            return Response(
                {'error': 'Outlook連携が設定されていません'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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
                if new_tokens.get('refresh_token'):
                    integration.set_refresh_token(new_tokens['refresh_token'])
                integration.save()
            except OutlookCalendarError as e:
                logger.error(f'Token refresh failed: {e}')
                integration.record_error(str(e))
                return Response(
                    {'error': 'トークン更新に失敗しました。再連携が必要です'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        
        try:
            from datetime import datetime
            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
            
            client = OutlookCalendarClient(integration.get_access_token())
            events = client.get_calendar_view(start_dt, end_dt)
            
            integration.mark_used()
            integration.clear_errors()
            
            return Response({
                'events': events,
            })
        except OutlookCalendarError as e:
            logger.error(f'CalendarView query failed: {e}')
            integration.record_error(str(e))
            return Response(
                {'error': '予定の取得に失敗しました'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except ValueError as e:
            return Response(
                {'error': f'日時の形式が不正です: {e}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class OutlookStatusView(APIView):
    """
    Outlook連携状態確認
    
    GET /api/v1/integrations/outlook/status/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            integration = UserIntegration.objects.get(
                user=request.user,
                provider='outlook',
            )
            return Response({
                'connected': integration.is_active and not integration.revoked_at,
                'is_valid': integration.is_valid,
                'is_expired': integration.is_expired,
                'expires_at': integration.expires_at,
                'last_used_at': integration.last_used_at,
                'error_count': integration.error_count,
            })
        except UserIntegration.DoesNotExist:
            return Response({
                'connected': False,
            })
