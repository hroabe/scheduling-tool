"""
Tests for Schedule API

Comprehensive tests for the scheduling tool's core functionality:
- CRUD operations
- Response submission
- Finalization
- Expiration handling
- Summary and export

Following quality-standards.md requirements:
- ドメインロジック: unit
- API: integration（期限切れ、編集トークン不正、確定後など）
- CSV/summary: 整合性テスト
"""

from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Schedule, Candidate, Participant, Attendance


class ScheduleCRUDTests(APITestCase):
    """スケジュールCRUD操作テスト"""
    
    def setUp(self):
        """テストデータのセットアップ"""
        self.tomorrow = timezone.now() + timedelta(days=1)
        self.day_after = timezone.now() + timedelta(days=2)
        self.valid_schedule_data = {
            'name': 'テストイベント',
            'description': 'テスト用の説明',
            'owner_name': 'テスト太郎',
            'owner_email': 'test@example.com',
            'edit_key': 'test-edit-key-123',
            'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
            'candidates': [
                {
                    'start_at': self.tomorrow.isoformat(),
                    'end_at': (self.tomorrow + timedelta(hours=1)).isoformat(),
                },
                {
                    'start_at': self.day_after.isoformat(),
                    'end_at': (self.day_after + timedelta(hours=1)).isoformat(),
                },
            ]
        }
    
    def test_create_schedule_success(self):
        """正常系: イベント作成"""
        response = self.client.post('/api/v1/schedules/', self.valid_schedule_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('uuid', response.data)
        self.assertEqual(response.data['name'], 'テストイベント')
        self.assertEqual(response.data['owner_name'], 'テスト太郎')
        
        # DBに保存されていることを確認
        schedule = Schedule.objects.get(uuid=response.data['uuid'])
        self.assertEqual(schedule.name, 'テストイベント')
        self.assertEqual(schedule.candidates.count(), 2)
        
        # edit_keyがhash化されて保存されていることを確認
        self.assertIsNone(schedule.edit_key)  # 平文は保存されない
        self.assertIsNotNone(schedule.edit_key_hash)  # hashが保存される
        self.assertTrue(schedule.check_edit_key('test-edit-key-123'))
    
    def test_create_schedule_without_candidates_fails(self):
        """異常系: 候補日なしでの作成は失敗"""
        data = self.valid_schedule_data.copy()
        data['candidates'] = []
        
        response = self.client.post('/api/v1/schedules/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('candidates', response.data)
    
    def test_create_schedule_with_past_deadline_fails(self):
        """異常系: 過去の期限日時での作成は失敗"""
        data = self.valid_schedule_data.copy()
        data['deadline'] = (timezone.now() - timedelta(days=1)).isoformat()
        
        response = self.client.post('/api/v1/schedules/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('deadline', response.data)
    
    def test_retrieve_schedule_by_uuid(self):
        """正常系: UUIDでイベント取得"""
        # 作成
        create_response = self.client.post('/api/v1/schedules/', self.valid_schedule_data, format='json')
        uuid = create_response.data['uuid']
        
        # 取得
        response = self.client.get(f'/api/v1/schedules/{uuid}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'テストイベント')
        self.assertIn('candidates', response.data)
        self.assertEqual(len(response.data['candidates']), 2)
    
    def test_update_schedule_with_valid_edit_key(self):
        """正常系: 有効なedit_keyで更新"""
        # 作成
        create_response = self.client.post('/api/v1/schedules/', self.valid_schedule_data, format='json')
        uuid = create_response.data['uuid']
        
        # 更新
        update_data = {'name': '更新されたイベント'}
        response = self.client.patch(
            f'/api/v1/schedules/{uuid}/?edit_key=test-edit-key-123',
            update_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], '更新されたイベント')
    
    def test_update_schedule_with_invalid_edit_key_fails(self):
        """異常系: 無効なedit_keyで更新は失敗"""
        # 作成
        create_response = self.client.post('/api/v1/schedules/', self.valid_schedule_data, format='json')
        uuid = create_response.data['uuid']
        
        # 無効なキーで更新を試みる
        update_data = {'name': '更新されたイベント'}
        response = self.client.patch(
            f'/api/v1/schedules/{uuid}/?edit_key=wrong-key',
            update_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_delete_schedule_with_valid_edit_key(self):
        """正常系: 有効なedit_keyで削除"""
        # 作成
        create_response = self.client.post('/api/v1/schedules/', self.valid_schedule_data, format='json')
        uuid = create_response.data['uuid']
        
        # 削除
        response = self.client.delete(f'/api/v1/schedules/{uuid}/?edit_key=test-edit-key-123')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Schedule.objects.filter(uuid=uuid).exists())
    
    def test_delete_schedule_with_invalid_edit_key_fails(self):
        """異常系: 無効なedit_keyで削除は失敗"""
        # 作成
        create_response = self.client.post('/api/v1/schedules/', self.valid_schedule_data, format='json')
        uuid = create_response.data['uuid']
        
        # 無効なキーで削除を試みる
        response = self.client.delete(f'/api/v1/schedules/{uuid}/?edit_key=wrong-key')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Schedule.objects.filter(uuid=uuid).exists())


class ScheduleResponseTests(APITestCase):
    """回答機能テスト"""
    
    def setUp(self):
        """テストデータのセットアップ"""
        # スケジュールを直接DBに作成
        self.schedule = Schedule.objects.create(
            name='回答テストイベント',
            owner_name='テスト太郎',
            deadline=timezone.now() + timedelta(days=7)
        )
        self.candidate1 = Candidate.objects.create(
            schedule=self.schedule,
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, hours=1),
            order=0
        )
        self.candidate2 = Candidate.objects.create(
            schedule=self.schedule,
            start_at=timezone.now() + timedelta(days=2),
            end_at=timezone.now() + timedelta(days=2, hours=1),
            order=1
        )
    
    def test_submit_response_success(self):
        """正常系: 回答送信"""
        data = {
            'name': '参加者A',
            'comment': 'よろしくお願いします',
            'attendances': [
                {'candidate': self.candidate1.id, 'status': 'ok'},
                {'candidate': self.candidate2.id, 'status': 'maybe'},
            ]
        }
        
        response = self.client.post(
            f'/api/v1/schedules/{self.schedule.uuid}/respond/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], '参加者A')
        self.assertIn('edit_token', response.data)
        
        # DB確認
        participant = Participant.objects.get(schedule=self.schedule, name='参加者A')
        self.assertEqual(participant.attendances.count(), 2)
        self.assertEqual(
            participant.attendances.get(candidate=self.candidate1).status,
            'ok'
        )
    
    def test_update_response_with_edit_token(self):
        """正常系: edit_tokenで回答編集"""
        # 最初の回答
        data = {
            'name': '参加者B',
            'attendances': [
                {'candidate': self.candidate1.id, 'status': 'ok'},
                {'candidate': self.candidate2.id, 'status': 'ok'},
            ]
        }
        create_response = self.client.post(
            f'/api/v1/schedules/{self.schedule.uuid}/respond/',
            data,
            format='json'
        )
        edit_token = create_response.data['edit_token']
        
        # 回答を編集
        update_data = {
            'name': '参加者B',
            'edit_token': edit_token,
            'attendances': [
                {'candidate': self.candidate1.id, 'status': 'ng'},
                {'candidate': self.candidate2.id, 'status': 'ok'},
            ]
        }
        update_response = self.client.post(
            f'/api/v1/schedules/{self.schedule.uuid}/respond/',
            update_data,
            format='json'
        )
        
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        
        # DB確認
        participant = Participant.objects.get(schedule=self.schedule, name='参加者B')
        self.assertEqual(
            participant.attendances.get(candidate=self.candidate1).status,
            'ng'
        )
    
    def test_duplicate_name_without_edit_token_fails(self):
        """異常系: edit_tokenなしで同名回答は失敗"""
        # 最初の回答
        data = {
            'name': '参加者C',
            'attendances': [
                {'candidate': self.candidate1.id, 'status': 'ok'},
            ]
        }
        self.client.post(
            f'/api/v1/schedules/{self.schedule.uuid}/respond/',
            data,
            format='json'
        )
        
        # 同名で再度回答（edit_tokenなし）
        response = self.client.post(
            f'/api/v1/schedules/{self.schedule.uuid}/respond/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_with_invalid_edit_token_fails(self):
        """異常系: 無効なedit_tokenで編集は失敗"""
        # 最初の回答
        data = {
            'name': '参加者D',
            'attendances': [
                {'candidate': self.candidate1.id, 'status': 'ok'},
            ]
        }
        self.client.post(
            f'/api/v1/schedules/{self.schedule.uuid}/respond/',
            data,
            format='json'
        )
        
        # 無効なトークンで編集を試みる
        update_data = {
            'name': '参加者D',
            'edit_token': 'invalid-token-123',
            'attendances': [
                {'candidate': self.candidate1.id, 'status': 'ng'},
            ]
        }
        response = self.client.post(
            f'/api/v1/schedules/{self.schedule.uuid}/respond/',
            update_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ScheduleFinalizeTests(APITestCase):
    """確定機能テスト"""
    
    def setUp(self):
        """テストデータのセットアップ"""
        self.schedule = Schedule.objects.create(
            name='確定テストイベント',
            owner_name='テスト太郎',
            deadline=timezone.now() + timedelta(days=7)
        )
        self.schedule.set_edit_key('finalize-key-123')
        self.schedule.save()
        
        self.candidate = Candidate.objects.create(
            schedule=self.schedule,
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, hours=1),
            order=0
        )
    
    def test_finalize_with_valid_edit_key(self):
        """正常系: 有効なedit_keyで確定"""
        data = {
            'candidate_id': self.candidate.id,
            'edit_key': 'finalize-key-123'
        }
        
        response = self.client.post(
            f'/api/v1/schedules/{self.schedule.uuid}/finalize/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # DB確認
        self.schedule.refresh_from_db()
        self.assertTrue(self.schedule.is_finalized)
        self.assertEqual(self.schedule.finalized_candidate, self.candidate)
    
    def test_finalize_with_invalid_edit_key_fails(self):
        """異常系: 無効なedit_keyで確定は失敗"""
        data = {
            'candidate_id': self.candidate.id,
            'edit_key': 'wrong-key'
        }
        
        response = self.client.post(
            f'/api/v1/schedules/{self.schedule.uuid}/finalize/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # DB確認
        self.schedule.refresh_from_db()
        self.assertFalse(self.schedule.is_finalized)
    
    def test_respond_after_finalize_fails(self):
        """異常系: 確定後の回答は失敗"""
        # 確定
        self.schedule.is_finalized = True
        self.schedule.finalized_candidate = self.candidate
        self.schedule.save()
        
        # 回答を試みる
        data = {
            'name': '遅い参加者',
            'attendances': [
                {'candidate': self.candidate.id, 'status': 'ok'},
            ]
        }
        
        response = self.client.post(
            f'/api/v1/schedules/{self.schedule.uuid}/respond/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ScheduleExpirationTests(APITestCase):
    """期限・状態テスト"""
    
    def setUp(self):
        """テストデータのセットアップ"""
        self.candidate_time = timezone.now() + timedelta(days=3)
    
    def test_respond_after_deadline_fails(self):
        """異常系: 期限切れ後の回答は失敗"""
        # 期限切れのスケジュールを作成
        schedule = Schedule.objects.create(
            name='期限切れイベント',
            owner_name='テスト太郎',
            deadline=timezone.now() - timedelta(hours=1)  # 過去
        )
        candidate = Candidate.objects.create(
            schedule=schedule,
            start_at=self.candidate_time,
            end_at=self.candidate_time + timedelta(hours=1),
            order=0
        )
        
        data = {
            'name': '参加者',
            'attendances': [
                {'candidate': candidate.id, 'status': 'ok'},
            ]
        }
        
        response = self.client.post(
            f'/api/v1/schedules/{schedule.uuid}/respond/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_respond_to_inactive_schedule_fails(self):
        """異常系: 非アクティブイベントへの回答は失敗"""
        schedule = Schedule.objects.create(
            name='非アクティブイベント',
            owner_name='テスト太郎',
            is_active=False
        )
        candidate = Candidate.objects.create(
            schedule=schedule,
            start_at=self.candidate_time,
            end_at=self.candidate_time + timedelta(hours=1),
            order=0
        )
        
        data = {
            'name': '参加者',
            'attendances': [
                {'candidate': candidate.id, 'status': 'ok'},
            ]
        }
        
        response = self.client.post(
            f'/api/v1/schedules/{schedule.uuid}/respond/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ScheduleSummaryExportTests(APITestCase):
    """集計・エクスポートテスト"""
    
    def setUp(self):
        """テストデータのセットアップ"""
        self.schedule = Schedule.objects.create(
            name='集計テストイベント',
            owner_name='テスト太郎'
        )
        self.candidate1 = Candidate.objects.create(
            schedule=self.schedule,
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, hours=1),
            order=0
        )
        self.candidate2 = Candidate.objects.create(
            schedule=self.schedule,
            start_at=timezone.now() + timedelta(days=2),
            end_at=timezone.now() + timedelta(days=2, hours=1),
            order=1
        )
        
        # 参加者と回答を作成
        self.participant1 = Participant.objects.create(
            schedule=self.schedule,
            name='参加者1'
        )
        Attendance.objects.create(
            schedule=self.schedule,
            participant=self.participant1,
            candidate=self.candidate1,
            status='ok'
        )
        Attendance.objects.create(
            schedule=self.schedule,
            participant=self.participant1,
            candidate=self.candidate2,
            status='ng'
        )
        
        self.participant2 = Participant.objects.create(
            schedule=self.schedule,
            name='参加者2'
        )
        Attendance.objects.create(
            schedule=self.schedule,
            participant=self.participant2,
            candidate=self.candidate1,
            status='ok'
        )
        Attendance.objects.create(
            schedule=self.schedule,
            participant=self.participant2,
            candidate=self.candidate2,
            status='ok'
        )
    
    def test_get_summary(self):
        """正常系: summary取得"""
        response = self.client.get(f'/api/v1/schedules/{self.schedule.uuid}/summary/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('candidates', response.data)
        self.assertIn('best_candidate', response.data)
        
        # candidate1が最適（2人OK vs 1人OK）
        candidates_data = response.data['candidates']
        candidate1_data = next(c for c in candidates_data if c['id'] == self.candidate1.id)
        self.assertEqual(candidate1_data['ok_count'], 2)
    
    def test_export_csv(self):
        """正常系: CSVエクスポート"""
        response = self.client.get(f'/api/v1/schedules/{self.schedule.uuid}/export_csv/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv; charset=utf-8-sig')
        
        # CSVの内容を確認 (BOM付きなのでutf-8-sigでデコード)
        content = response.content.decode('utf-8-sig')
        self.assertIn('参加者1', content)
        self.assertIn('参加者2', content)


class EditKeyHashMigrationTests(TestCase):
    """edit_key hash化移行テスト"""
    
    def test_new_schedule_uses_hash(self):
        """新規作成はhashのみ保存"""
        schedule = Schedule.objects.create(
            name='ハッシュテスト',
            owner_name='テスト'
        )
        raw_key = 'my-secret-key'
        schedule.set_edit_key(raw_key)
        schedule.save()
        
        # 平文は保存されない
        self.assertIsNone(schedule.edit_key)
        # hashが保存される
        self.assertIsNotNone(schedule.edit_key_hash)
        # 検証が動作する
        self.assertTrue(schedule.check_edit_key(raw_key))
        self.assertFalse(schedule.check_edit_key('wrong-key'))
    
    def test_legacy_plaintext_fallback(self):
        """既存の平文データもフォールバックで動作"""
        schedule = Schedule.objects.create(
            name='レガシーテスト',
            owner_name='テスト',
            edit_key='legacy-plaintext-key'  # 旧形式
        )
        
        # hashがない場合は平文で検証
        self.assertTrue(schedule.check_edit_key('legacy-plaintext-key'))
        self.assertFalse(schedule.check_edit_key('wrong-key'))


class EditTokenHashMigrationTests(TestCase):
    """edit_token hash化移行テスト"""
    
    def test_new_participant_uses_hash(self):
        """新規参加者はhashのみ保存"""
        schedule = Schedule.objects.create(
            name='トークンテスト',
            owner_name='テスト'
        )
        participant = Participant.objects.create(
            schedule=schedule,
            name='参加者'
        )
        
        raw_token = 'my-secret-token'
        participant.set_edit_token(raw_token)
        participant.save()
        
        # hashが保存される
        self.assertIsNotNone(participant.edit_token_hash)
        # 検証が動作する
        self.assertTrue(participant.check_edit_token(raw_token))
        self.assertFalse(participant.check_edit_token('wrong-token'))
    
    def test_legacy_uuid_fallback(self):
        """既存のUUIDトークンもフォールバックで動作"""
        schedule = Schedule.objects.create(
            name='レガシートークンテスト',
            owner_name='テスト'
        )
        participant = Participant.objects.create(
            schedule=schedule,
            name='参加者'
        )
        
        # edit_token_hashがない場合、edit_token（UUID）で検証
        # Note: edit_tokenはUUIDFieldなので自動生成される
        legacy_token = str(participant.edit_token)
        self.assertTrue(participant.check_edit_token(legacy_token))
        self.assertFalse(participant.check_edit_token('wrong-token'))
