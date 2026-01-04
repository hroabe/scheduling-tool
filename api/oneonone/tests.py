"""
Tests for 1-on-1 Scheduling API (RFC-0005)

Comprehensive tests for:
- Availability Page management
- Slot management
- Booking flows (Guest functional tests)
- Host management flows
"""

from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

from .models import AvailabilityPage, AvailabilitySlot, Booking


class OneOnOneBaseTestCase(APITestCase):
    """Base test case with common setup"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='host_user',
            email='host@example.com',
            password='Password123!'
        )
        self.client.force_authenticate(user=self.user)
        
        # Default page data
        self.page_data = {
            'slug': 'test-meeting',
            'title': 'Test Meeting',
            'description': '30 min chat',
            'duration_minutes': 30,
            'is_public': True,
        }


class AvailabilityPageTests(OneOnOneBaseTestCase):
    """予約ページ管理テスト"""
    
    def test_create_page(self):
        """正常系: 予約ページ作成"""
        response = self.client.post('/api/v1/oneonone/pages/', self.page_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['slug'], 'test-meeting')
        self.assertEqual(response.data['owner_name'], 'host_user')
        
        # Verify DB
        page = AvailabilityPage.objects.get(slug='test-meeting')
        self.assertEqual(page.owner, self.user)
    
    def test_create_duplicate_slug_fails(self):
        """異常系: 重複スラッグはエラー"""
        AvailabilityPage.objects.create(owner=self.user, **self.page_data)
        
        response = self.client.post('/api/v1/oneonone/pages/', self.page_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('slug', response.data)
        
    def test_list_pages(self):
        """正常系: ページ一覧取得"""
        AvailabilityPage.objects.create(owner=self.user, **self.page_data)
        
        response = self.client.get('/api/v1/oneonone/pages/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle pagination (results list) or plain list
        if 'results' in response.data:
            data = response.data['results']
        else:
            data = response.data
            
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['slug'], 'test-meeting')

    def test_other_user_page_invisible(self):
        """正常系: 他人のページは見えない"""
        other_user = User.objects.create_user('other', 'other@example.com', 'pass')
        AvailabilityPage.objects.create(
            owner=other_user,
            slug='other-meeting',
            title='Other Meeting'
        )
        
        response = self.client.get('/api/v1/oneonone/pages/')
        
        if 'results' in response.data:
            data = response.data['results']
        else:
            data = response.data
            
        self.assertEqual(len(data), 0)


class AvailabilitySlotTests(OneOnOneBaseTestCase):
    """空き枠管理テスト"""
    
    def setUp(self):
        super().setUp()
        self.page = AvailabilityPage.objects.create(owner=self.user, **self.page_data)
        self.tomorrow = timezone.now() + timedelta(days=1)
    
    def test_add_slots(self):
        """正常系: 空き枠追加"""
        slots_data = {
            'slots': [
                {
                    'start_at': self.tomorrow.replace(hour=10, minute=0).isoformat(),
                    'end_at': self.tomorrow.replace(hour=10, minute=30).isoformat(),
                },
                {
                    'start_at': self.tomorrow.replace(hour=11, minute=0).isoformat(),
                    'end_at': self.tomorrow.replace(hour=11, minute=30).isoformat(),
                }
            ]
        }
        
        response = self.client.post(
            f'/api/v1/oneonone/pages/{self.page.id}/add_slots/',
            slots_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['created']), 2)
        self.assertEqual(self.page.slots.count(), 2)
        
    def test_add_slot_invalid_time(self):
        """異常系: 無効な時間（終了 < 開始）"""
        slots_data = {
            'slots': [{
                'start_at': self.tomorrow.replace(hour=10, minute=0).isoformat(),
                'end_at': self.tomorrow.replace(hour=9, minute=0).isoformat(),
            }]
        }
        
        response = self.client.post(
            f'/api/v1/oneonone/pages/{self.page.id}/add_slots/',
            slots_data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PublicBookingTests(APITestCase):
    """ゲスト予約フローテスト"""
    
    def setUp(self):
        self.owner = User.objects.create_user('host', 'host@example.com', 'pass')
        self.page = AvailabilityPage.objects.create(
             owner=self.owner,
             slug='public-mtg',
             title='Public Meeting',
             is_public=True,
             is_active=True
        )
        self.slot_time = timezone.now() + timedelta(days=1)
        self.slot = AvailabilitySlot.objects.create(
            page=self.page,
            start_at=self.slot_time,
            end_at=self.slot_time + timedelta(minutes=30)
        )
        
    def test_get_public_page(self):
        """正常系: 公開ページ閲覧"""
        response = self.client.get(f'/api/v1/oneonone/p/{self.page.slug}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Public Meeting')
        
        # available_slots is NOT paginated by default in PublicAvailabilityPageView?
        # Check logic: serializer uses obj.get_available_slots()[:100], so it's a list.
        self.assertEqual(len(response.data['available_slots']), 1)
        
    def test_book_slot_success(self):
        """正常系: 予約作成"""
        data = {
            'slot': self.slot.id,
            'guest_name': 'Guest User',
            'guest_email': 'guest@example.com',
            'guest_message': 'Hello'
        }
        
        response = self.client.post(
            f'/api/v1/oneonone/p/{self.page.slug}/book/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('cancel_token', response.data)
        
        # Verify Slot is booked
        self.slot.refresh_from_db()
        self.assertTrue(self.slot.is_booked)
        
        # Verify Booking created
        booking = Booking.objects.get(slot=self.slot)
        self.assertEqual(booking.guest_name, 'Guest User')
        self.assertEqual(booking.status, 'pending')

    def test_book_already_booked_slot_fails(self):
        """異常系: 予約済みスロットへの予約"""
        # First booking
        Booking.objects.create(
            slot=self.slot,
            guest_name='First',
            guest_email='first@example.com'
        )
        self.slot.is_booked = True
        self.slot.save()
        
        # Second attempt
        data = {
            'slot': self.slot.id,
            'guest_name': 'Second',
            'guest_email': 'second@example.com'
        }
        
        response = self.client.post(
            f'/api/v1/oneonone/p/{self.page.slug}/book/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_guest_cancel_booking(self):
        """正常系: ゲストによるキャンセル"""
        booking = Booking.objects.create(
            slot=self.slot,
            guest_name='Guest',
            guest_email='guest@example.com'
        )
        self.slot.is_booked = True
        self.slot.save()
        
        data = {'cancel_token': booking.cancel_token}
        
        response = self.client.post(
            f'/api/v1/oneonone/booking/{booking.uuid}/cancel/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'cancelled')
        
        self.slot.refresh_from_db()
        self.assertFalse(self.slot.is_booked)


class HostBookingManagementTests(OneOnOneBaseTestCase):
    """ホスト予約管理テスト"""
    
    def setUp(self):
        super().setUp()
        self.page = AvailabilityPage.objects.create(owner=self.user, **self.page_data)
        self.slot = AvailabilitySlot.objects.create(
            page=self.page,
            start_at=timezone.now() + timedelta(days=1),
            end_at=timezone.now() + timedelta(days=1, minutes=30),
            is_booked=True
        )
        self.booking = Booking.objects.create(
            slot=self.slot,
            guest_name='Guest',
            guest_email='guest@example.com'
        )
        
    def test_list_bookings(self):
        """正常系: 予約一覧取得"""
        response = self.client.get(f'/api/v1/oneonone/bookings/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        if 'results' in response.data:
            data = response.data['results']
        else:
            data = response.data
            
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['uuid'], str(self.booking.uuid))
        
    def test_confirm_booking(self):
        """正常系: 予約確定"""
        response = self.client.post(f'/api/v1/oneonone/bookings/{self.booking.uuid}/confirm/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'confirmed')
        self.assertIsNotNone(self.booking.confirmed_at)
