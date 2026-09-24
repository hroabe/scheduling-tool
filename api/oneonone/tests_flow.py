"""
End-to-end API tests for the login-free 1-on-1 booking flow (RFC-0005 v2, docs/11_integration.md)
"""

from datetime import timedelta

from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import AvailabilityPage, Booking


def future(hours):
    return (timezone.now() + timedelta(hours=hours)).replace(microsecond=0)


@override_settings(FRONTEND_URL='https://app.example.com')
class AnonymousBookingFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def create_page(self, **extra):
        payload = {
            'title': '面談',
            'organizer_name': '主催 太郎',
            'organizer_email': 'host@example.com',
            'duration_minutes': 30,
            'slots': [
                {'start_at': future(24).isoformat(), 'end_at': (future(24) + timedelta(minutes=30)).isoformat()},
                {'start_at': future(48).isoformat(), 'end_at': (future(48) + timedelta(minutes=30)).isoformat()},
            ],
        }
        payload.update(extra)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/v1/oneonone/booking/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def host(self, token):
        return {'HTTP_X_HOST_TOKEN': token}

    def verify(self, created):
        body = mail.outbox[-1].body
        verify_url = next(line for line in body.splitlines() if '/booking/verify?' in line)
        token = verify_url.split('token=')[1]
        return self.client.post('/api/v1/oneonone/booking/verify/',
                                {'slug': created['slug'], 'token': token}, format='json')

    def test_create_returns_host_token_and_emails_links(self):
        created = self.create_page()
        self.assertTrue(created['host_token'])
        self.assertEqual(created['status'], 'PENDING_VERIFY')
        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        self.assertIn(f"https://app.example.com/booking/verify?slug={created['slug']}", body)
        self.assertIn(f"https://app.example.com/booking/{created['slug']}/host?token={created['host_token']}", body)
        # 認証前はゲストに公開されない
        self.assertEqual(self.client.get(f"/api/v1/oneonone/booking/{created['slug']}/").status_code, 404)

    @override_settings(DEBUG=False)
    def test_verify_url_not_returned_in_production(self):
        created = self.create_page()
        self.assertNotIn('verify_url', created)

    def test_verify_publishes_page_and_is_idempotent(self):
        created = self.create_page()
        response = self.verify(created)
        self.assertEqual(response.json()['status'], 'PUBLISHED')
        self.assertEqual(self.verify(created).status_code, 200)
        public = self.client.get(f"/api/v1/oneonone/booking/{created['slug']}/").json()
        self.assertEqual(public['organizer'], '主催 太郎')
        self.assertEqual(len(public['available_slots']), 2)

    def test_wrong_verify_token_rejected(self):
        created = self.create_page()
        response = self.client.post('/api/v1/oneonone/booking/verify/',
                                    {'slug': created['slug'], 'token': 'nope'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_host_access_requires_token(self):
        created = self.create_page()
        url = f"/api/v1/oneonone/booking/{created['slug']}/host/"
        self.assertEqual(self.client.get(url).status_code, 403)
        self.assertEqual(self.client.get(url, **self.host('wrong')).status_code, 403)
        data = self.client.get(url, **self.host(created['host_token'])).json()
        self.assertEqual(data['organizer_email'], 'host@example.com')
        self.assertEqual(len(data['slots']), 2)

    def test_host_resend_verification(self):
        created = self.create_page()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                f"/api/v1/oneonone/booking/{created['slug']}/host/resend-verification/",
                {}, format='json', **self.host(created['host_token']))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(self.verify(created).status_code, 200)

    def test_booking_cancel_and_rebook_with_notifications(self):
        created = self.create_page()
        self.verify(created)
        slug = created['slug']
        slot_id = self.client.get(f'/api/v1/oneonone/booking/{slug}/').json()['available_slots'][0]['id']
        mail.outbox.clear()

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(f'/api/v1/oneonone/booking/{slug}/reserve/', {
                'slot': slot_id, 'guest_name': 'ゲスト', 'guest_email': 'guest@example.com',
            }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        booking = response.json()
        cancel_token = booking['cancel_token']
        recipients = sorted(m.to[0] for m in mail.outbox)
        self.assertEqual(recipients, ['guest@example.com', 'host@example.com'])
        guest_mail = next(m for m in mail.outbox if m.to == ['guest@example.com'])
        self.assertIn(f"/booking/cancel?booking={booking['booking']['uuid']}&token={cancel_token}", guest_mail.body)

        # 同じ枠は予約不可
        again = self.client.post(f'/api/v1/oneonone/booking/{slug}/reserve/', {
            'slot': slot_id, 'guest_name': 'x', 'guest_email': 'x@example.com'}, format='json')
        self.assertEqual(again.status_code, 400)

        # キャンセルトークンはハッシュのみ保存
        stored = Booking.objects.get(uuid=booking['booking']['uuid'])
        self.assertNotEqual(stored.cancel_token_hash, cancel_token)

        # 予約詳細: キャンセルトークン無しではゲストの連絡先を返さない
        detail_url = f"/api/v1/oneonone/booking/{booking['booking']['uuid']}/"
        public = self.client.get(detail_url).json()
        self.assertNotIn('guest_email', public)
        self.assertEqual(public['guest_name'], 'ゲスト')
        owner_view = self.client.get(detail_url, HTTP_X_CANCEL_TOKEN=cancel_token).json()
        self.assertEqual(owner_view['guest_email'], 'guest@example.com')

        mail.outbox.clear()
        with self.captureOnCommitCallbacks(execute=True):
            cancel = self.client.post(f"/api/v1/oneonone/booking/{booking['booking']['uuid']}/cancel/",
                                      {'cancel_token': cancel_token}, format='json')
        self.assertEqual(cancel.status_code, 200)
        self.assertEqual(mail.outbox[0].to, ['host@example.com'])

        # キャンセル後は同じ枠を再予約できる（旧実装では IntegrityError）
        rebook = self.client.post(f'/api/v1/oneonone/booking/{slug}/reserve/', {
            'slot': slot_id, 'guest_name': '別のゲスト', 'guest_email': 'g2@example.com'}, format='json')
        self.assertEqual(rebook.status_code, 201, rebook.content)

    def test_invalid_cancel_token(self):
        created = self.create_page()
        self.verify(created)
        slug = created['slug']
        slot_id = self.client.get(f'/api/v1/oneonone/booking/{slug}/').json()['available_slots'][0]['id']
        booking = self.client.post(f'/api/v1/oneonone/booking/{slug}/reserve/', {
            'slot': slot_id, 'guest_name': 'g', 'guest_email': 'g@example.com'}, format='json').json()
        response = self.client.post(f"/api/v1/oneonone/booking/{booking['booking']['uuid']}/cancel/",
                                    {'cancel_token': 'wrong'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_host_manages_slots_and_cancels_booking(self):
        created = self.create_page()
        self.verify(created)
        slug, token = created['slug'], created['host_token']
        new_start = future(72)
        add = self.client.post(f'/api/v1/oneonone/booking/{slug}/host/slots/', {'slots': [
            {'start_at': new_start.isoformat(), 'end_at': (new_start + timedelta(minutes=30)).isoformat()},
            {'start_at': new_start.isoformat(), 'end_at': (new_start + timedelta(minutes=30)).isoformat()},
        ]}, format='json', **self.host(token))
        self.assertEqual(add.status_code, 201)
        self.assertEqual(len(add.json()['created']), 1)
        self.assertEqual(len(add.json()['errors']), 1)  # 重複枠は拒否

        slot_id = add.json()['created'][0]['id']
        booking = self.client.post(f'/api/v1/oneonone/booking/{slug}/reserve/', {
            'slot': slot_id, 'guest_name': 'g', 'guest_email': 'g@example.com'}, format='json').json()
        # 予約済みの枠は削除できない
        delete = self.client.delete(f'/api/v1/oneonone/booking/{slug}/host/slots/{slot_id}/', **self.host(token))
        self.assertEqual(delete.status_code, 400)

        mail.outbox.clear()
        with self.captureOnCommitCallbacks(execute=True):
            cancel = self.client.post(
                f"/api/v1/oneonone/booking/{slug}/host/bookings/{booking['booking']['uuid']}/cancel/",
                {}, format='json', **self.host(token))
        self.assertEqual(cancel.status_code, 200)
        self.assertEqual(mail.outbox[0].to, ['g@example.com'])

        # 主催者は受付を停止できる
        patch = self.client.patch(f'/api/v1/oneonone/booking/{slug}/host/', {'is_active': False},
                                  format='json', **self.host(token))
        self.assertFalse(patch.json()['is_active'])
        self.assertEqual(self.client.get(f'/api/v1/oneonone/booking/{slug}/').status_code, 404)


class OwnerPageTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user('host', 'host@example.com', 'pass-1234-word', first_name='太郎')
        self.client.force_authenticate(self.user)

    def test_owner_page_is_published_and_slug_update_allows_own_slug(self):
        response = self.client.post('/api/v1/oneonone/pages/', {
            'slug': 'my-page', 'title': '相談', 'duration_minutes': 30,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        page = AvailabilityPage.objects.get(slug='my-page')
        self.assertEqual(page.status, 'PUBLISHED')

        update = self.client.patch(f'/api/v1/oneonone/pages/{page.id}/', {'slug': 'my-page', 'title': '相談2'},
                                   format='json')
        self.assertEqual(update.status_code, 200, update.content)

        self.client.force_authenticate(None)
        public = self.client.get('/api/v1/oneonone/booking/my-page/')
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.json()['organizer'], '太郎')
