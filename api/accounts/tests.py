"""
Tests for Accounts API

Unit and integration tests for authentication, registration, and owned schedules.
"""

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import UserProfile, UserIntegration


class UserRegistrationTests(APITestCase):
    """ユーザー登録テスト"""
    
    def test_register_success(self):
        """正常な登録"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        response = self.client.post('/api/v1/accounts/register/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'testuser')
        
        # Check user and profile created
        self.assertTrue(User.objects.filter(username='testuser').exists())
        user = User.objects.get(username='testuser')
        self.assertTrue(UserProfile.objects.filter(user=user).exists())
    
    def test_register_password_mismatch(self):
        """パスワード不一致"""
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'DifferentPass456!'
        }
        response = self.client.post('/api/v1/accounts/register/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)
    
    def test_register_duplicate_email(self):
        """重複メールアドレス"""
        User.objects.create_user('existing', 'test@example.com', 'pass')
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!'
        }
        response = self.client.post('/api/v1/accounts/register/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)


class UserLoginTests(APITestCase):
    """ログインテスト"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!'
        )
        UserProfile.objects.create(user=self.user)
    
    def test_login_success(self):
        """正常なログイン"""
        data = {
            'username': 'testuser',
            'password': 'SecurePass123!'
        }
        response = self.client.post('/api/v1/accounts/login/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)
    
    def test_login_invalid_password(self):
        """無効なパスワード"""
        data = {
            'username': 'testuser',
            'password': 'WrongPassword!'
        }
        response = self.client.post('/api/v1/accounts/login/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_nonexistent_user(self):
        """存在しないユーザー"""
        data = {
            'username': 'nonexistent',
            'password': 'AnyPassword!'
        }
        response = self.client.post('/api/v1/accounts/login/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserProfileTests(APITestCase):
    """プロファイルテスト"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='SecurePass123!'
        )
        UserProfile.objects.create(user=self.user)
        self.client.force_authenticate(user=self.user)
    
    def test_get_profile(self):
        """プロファイル取得"""
        response = self.client.get('/api/v1/accounts/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
    
    def test_update_profile(self):
        """プロファイル更新"""
        data = {
            'first_name': 'Updated',
            'timezone_name': 'America/New_York'
        }
        response = self.client.patch('/api/v1/accounts/me/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh from DB
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated')
    
    def test_unauthenticated_access(self):
        """未認証アクセス拒否"""
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/v1/accounts/me/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PasswordChangeTests(APITestCase):
    """パスワード変更テスト"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='OldPassword123!'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_password_change_success(self):
        """正常なパスワード変更"""
        data = {
            'old_password': 'OldPassword123!',
            'new_password': 'NewPassword456!',
            'new_password_confirm': 'NewPassword456!'
        }
        response = self.client.post('/api/v1/accounts/password/change/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify new password works
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPassword456!'))
    
    def test_password_change_wrong_old(self):
        """現在のパスワードが間違い"""
        data = {
            'old_password': 'WrongOldPassword!',
            'new_password': 'NewPassword456!',
            'new_password_confirm': 'NewPassword456!'
        }
        response = self.client.post('/api/v1/accounts/password/change/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserIntegrationModelTests(TestCase):
    """UserIntegrationモデルテスト"""
    
    def setUp(self):
        self.user = User.objects.create_user('testuser', 'test@example.com', 'pass')
    
    def test_token_encryption(self):
        """トークンの暗号化/復号化"""
        from django.utils import timezone
        from datetime import timedelta
        
        integration = UserIntegration.objects.create(
            user=self.user,
            provider='google',
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        # Set tokens
        access_token = 'test_access_token_12345'
        refresh_token = 'test_refresh_token_67890'
        
        integration.set_access_token(access_token)
        integration.set_refresh_token(refresh_token)
        integration.save()
        
        # Reload from DB and verify
        integration.refresh_from_db()
        self.assertEqual(integration.get_access_token(), access_token)
        self.assertEqual(integration.get_refresh_token(), refresh_token)
        
        # Verify stored value is encrypted (not plaintext)
        self.assertNotEqual(integration._access_token_encrypted, access_token)
    
    def test_revoke_integration(self):
        """連携解除"""
        from django.utils import timezone
        from datetime import timedelta
        
        integration = UserIntegration.objects.create(
            user=self.user,
            provider='google',
            expires_at=timezone.now() + timedelta(hours=1)
        )
        integration.set_access_token('token')
        integration.save()
        
        self.assertTrue(integration.is_active)
        self.assertIsNone(integration.revoked_at)
        
        integration.revoke()
        
        self.assertFalse(integration.is_active)
        self.assertIsNotNone(integration.revoked_at)
