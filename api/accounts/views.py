"""
Views for Accounts API

User registration, authentication, profile, owned schedules, and integrations.
"""

from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from rest_framework import viewsets, status, generics
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


class RegisterView(generics.CreateAPIView):
    """
    ユーザー登録
    
    POST /api/v1/accounts/register/
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Auto login after registration
        login(request, user)
        
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'message': '登録が完了しました。'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    ログイン（セッション認証）
    
    POST /api/v1/accounts/login/
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        login(request, user)
        
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'message': 'ログインしました。'
        })


class LogoutView(APIView):
    """
    ログアウト
    
    POST /api/v1/accounts/logout/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
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
        user_fields = ['first_name', 'last_name', 'email']
        for field in user_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
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
