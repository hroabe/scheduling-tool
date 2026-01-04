"""
Serializers for Accounts API

User registration, authentication, profile, and integrations.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from .models import UserProfile, UserIntegration


class UserProfileSerializer(serializers.ModelSerializer):
    """ユーザープロファイルシリアライザー"""
    class Meta:
        model = UserProfile
        fields = ['timezone_name', 'email_notifications', 'avatar_url']


class UserSerializer(serializers.ModelSerializer):
    """ユーザーシリアライザー（読み取り用）"""
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """ユーザー登録用シリアライザー"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate_email(self, value):
        """メールアドレスの重複チェック"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('このメールアドレスは既に使用されています。')
        return value
    
    def validate(self, attrs):
        """パスワード確認の検証"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'パスワードが一致しません。'
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        # Create user profile
        UserProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    """ログイン用シリアライザー"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(
                request=self.context.get('request'),
                username=username,
                password=password
            )
            if not user:
                raise serializers.ValidationError('ユーザー名またはパスワードが正しくありません。')
            if not user.is_active:
                raise serializers.ValidationError('このアカウントは無効です。')
            attrs['user'] = user
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """パスワード変更用シリアライザー"""
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('現在のパスワードが正しくありません。')
        return value
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'パスワードが一致しません。'
            })
        return attrs
    
    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserIntegrationSerializer(serializers.ModelSerializer):
    """外部連携シリアライザー（読み取り用）"""
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = UserIntegration
        fields = [
            'id', 'provider', 'provider_display', 'is_active', 
            'is_valid', 'is_expired', 'expires_at', 'scopes',
            'last_used_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
