"""
Views for Accounts API

User registration, authentication, profile, owned schedules, and integrations.
"""

from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import viewsets, status, generics
from rest_framework.authtoken.models import Token
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from schedule.models import Schedule
from schedule.serializers import ScheduleListSerializer
from .models import UserProfile, UserIntegration
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserProfileSerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    UserIntegrationSerializer,
)


def _wants_token(request) -> bool:
    """Clients that cannot keep cookies (mobile) ask for an API token."""
    value = request.data.get('issue_token') if hasattr(request.data, 'get') else None
    return value in (True, 'true', '1', 1)


@method_decorator(ensure_csrf_cookie, name='get')
class CsrfView(APIView):
    """
    CSRF cookie を発行する（SPA が X-CSRFToken ヘッダーに設定して使う）

    GET /api/v1/accounts/csrf/
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'detail': 'ok'})


class RegisterView(generics.CreateAPIView):
    """
    ユーザー登録
    
    POST /api/v1/accounts/register/
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Auto login after registration
        login(request, user, backend='accounts.backends.EmailOrUsernameBackend')

        data = {
            'user': UserSerializer(user, context={'request': request}).data,
            'message': '登録が完了しました。'
        }
        if _wants_token(request):
            data['token'] = Token.objects.get_or_create(user=user)[0].key
        return Response(data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    ログイン（セッション認証）
    
    POST /api/v1/accounts/login/
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        login(request, user)

        data = {
            'user': UserSerializer(user, context={'request': request}).data,
            'message': 'ログインしました。'
        }
        if _wants_token(request):
            # Mobile clients authenticate with `Authorization: Token <key>`
            data['token'] = Token.objects.get_or_create(user=user)[0].key
        return Response(data)


class LogoutView(APIView):
    """
    ログアウト
    
    POST /api/v1/accounts/logout/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if isinstance(request.auth, Token):
            request.auth.delete()
        logout(request)
        return Response({'message': 'ログアウトしました。'})


class MeView(APIView):
    """
    現在のユーザー情報取得/更新
    
    GET /api/v1/accounts/me/
    PATCH /api/v1/accounts/me/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)
    
    def patch(self, request):
        user = request.user
        
        # Update user fields
        if 'email' in request.data:
            email = (request.data.get('email') or '').strip()
            if email and User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                return Response(
                    {'email': ['このメールアドレスは既に使用されています。']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        for field in ['first_name', 'last_name', 'email']:
            if field in request.data:
                setattr(user, field, (request.data[field] or '').strip())
        user.save()
        
        # Update profile fields
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile_serializer = UserProfileSerializer(
            profile,
            data=request.data,
            partial=True
        )
        if profile_serializer.is_valid():
            profile_serializer.save()
        
        return Response(UserSerializer(user, context={'request': request}).data)


class PasswordChangeView(APIView):
    """
    パスワード変更
    
    POST /api/v1/accounts/password/change/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'パスワードを変更しました。'})


class MySchedulesView(generics.ListAPIView):
    """
    自分が作成したイベント一覧
    
    GET /api/v1/accounts/me/schedules/
    """
    serializer_class = ScheduleListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Schedule.objects.filter(
            owner_user=self.request.user,
            is_active=True
        ).order_by('-created_at')


class IntegrationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    外部連携一覧（読み取り専用）
    
    連携/解除は各プロバイダーのエンドポイントで行う
    """
    serializer_class = UserIntegrationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserIntegration.objects.filter(
            user=self.request.user
        ).order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def disconnect(self, request, pk=None):
        """
        連携を無効化
        
        POST /api/v1/accounts/integrations/{id}/disconnect/
        """
        integration = self.get_object()
        integration.revoke()
        return Response({'message': '連携を解除しました。'})
