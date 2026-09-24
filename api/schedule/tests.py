"""
Tests for the Schedule API (docs/07_testing.md)

Run: python manage.py test schedule
"""

import csv
import io
from datetime import timedelta, timezone as dt_timezone

from django.contrib.auth.hashers import identify_hasher
from django.core.cache import cache
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Attendance, Candidate, Participant, Schedule
from .views import _fold_ics_line, _sanitize_csv_value, _sanitize_ics_value

EDIT_KEY = 'secret123'


def future(days=1, hours=0):
    base = timezone.now().replace(minute=0, second=0, microsecond=0)
    return base + timedelta(days=days, hours=hours)


@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class APITestBase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def create_schedule(self, edit_key=EDIT_KEY, candidates=2, **extra):
        payload = {
            'name': 'チームミーティング',
            'owner_name': '山田太郎',
            'description': '週次定例会議',
            'candidates': [
                {
                    'start_at': future(days=i + 1).isoformat(),
                    'end_at': future(days=i + 1, hours=1).isoformat(),
                }
                for i in range(candidates)
            ],
        }
        if edit_key is not None:
            payload['edit_key'] = edit_key
        payload.update(extra)
        response = self.client.post('/api/v1/schedules/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def url(self, data, suffix=''):
        return f"/api/v1/schedules/{data['uuid']}/{suffix}"

    def respond(self, data, name, statuses, **extra):
        candidates = data['candidates']
        payload = {
            'name': name,
            'comment': extra.pop('comment', ''),
            'attendances': [
                {'candidate': c['id'], 'status': s} for c, s in zip(candidates, statuses)
            ],
        }
        payload.update(extra)
        return self.client.post(self.url(data, 'respond/'), payload, format='json')


# ---------------------------------------------------------------------------
# Category 1: Schedule CRUD
# ---------------------------------------------------------------------------

class ScheduleCRUDTests(APITestBase):
    def test_create_schedule(self):
        data = self.create_schedule()
        self.assertIn('uuid', data)
        self.assertEqual(data['url'], f"/event/{data['uuid']}")
        self.assertTrue(Schedule.objects.filter(uuid=data['uuid']).exists())
        self.assertNotIn('edit_key', data)
        self.assertNotIn('_edit_key', data)  # 入力したキーは返さない

    def test_create_with_candidates(self):
        data = self.create_schedule(candidates=3)
        self.assertEqual(len(data['candidates']), 3)
        self.assertEqual(Candidate.objects.filter(schedule__uuid=data['uuid']).count(), 3)

    def test_create_requires_candidate(self):
        response = self.client.post('/api/v1/schedules/', {
            'name': 'x', 'owner_name': 'y', 'candidates': [],
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_create_rejects_invalid_time_range(self):
        response = self.client.post('/api/v1/schedules/', {
            'name': 'x', 'owner_name': 'y',
            'candidates': [{'start_at': future(2).isoformat(), 'end_at': future(1).isoformat()}],
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_create_rejects_past_deadline(self):
        response = self.client.post('/api/v1/schedules/', {
            'name': 'x', 'owner_name': 'y',
            'deadline': (timezone.now() - timedelta(days=1)).isoformat(),
            'candidates': [{'start_at': future(1).isoformat(), 'end_at': future(1, 1).isoformat()}],
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_create_without_edit_key_generates_one(self):
        data = self.create_schedule(edit_key=None)
        self.assertTrue(data['_edit_key'])
        schedule = Schedule.objects.get(uuid=data['uuid'])
        self.assertTrue(schedule.check_edit_key(data['_edit_key']))
        # 以降の取得では返されない
        detail = self.client.get(self.url(data)).json()
        self.assertNotIn('_edit_key', detail)
        self.assertTrue(detail['has_edit_key'])

    def test_retrieve_by_uuid(self):
        data = self.create_schedule()
        response = self.client.get(self.url(data))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'チームミーティング')

    def test_retrieve_unknown_uuid(self):
        response = self.client.get('/api/v1/schedules/00000000-0000-0000-0000-000000000000/')
        self.assertEqual(response.status_code, 404)

    def test_retrieve_by_integer_id_is_not_possible(self):
        data = self.create_schedule()
        response = self.client.get(f"/api/v1/schedules/{data['id']}/")
        self.assertEqual(response.status_code, 404)

    def test_update_without_edit_key(self):
        """edit_key未設定（旧データ）のイベントはキーなしで更新できる"""
        data = self.create_schedule()
        Schedule.objects.filter(uuid=data['uuid']).update(edit_key=None)
        response = self.client.patch(self.url(data), {'name': '新しい名前'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], '新しい名前')

    def test_delete_schedule(self):
        data = self.create_schedule()
        response = self.client.delete(self.url(data), HTTP_X_EDIT_KEY=EDIT_KEY)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Schedule.objects.filter(uuid=data['uuid']).exists())

    def test_retrieve_query_count_is_constant(self):
        data = self.create_schedule(candidates=5)
        for i in range(5):
            self.respond(data, f'user{i}', ['ok'] * 5)
        with CaptureQueriesContext(connection) as ctx:
            self.client.get(self.url(data))
        self.assertLessEqual(len(ctx.captured_queries), 5)


# ---------------------------------------------------------------------------
# Category 2: respond
# ---------------------------------------------------------------------------

class RespondTests(APITestBase):
    def test_submit_response(self):
        data = self.create_schedule()
        response = self.respond(data, '佐藤花子', ['ok', 'maybe'], comment='午後なら参加できます')
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertTrue(body['edit_token'])
        self.assertEqual(body['name'], '佐藤花子')

    def test_response_creates_attendance(self):
        data = self.create_schedule()
        self.respond(data, '佐藤花子', ['ok', 'ng'])
        participant = Participant.objects.get(name='佐藤花子')
        self.assertEqual(participant.attendances.count(), 2)
        self.assertEqual(
            set(participant.attendances.values_list('status', flat=True)), {'ok', 'ng'}
        )

    def test_update_response_with_edit_token(self):
        data = self.create_schedule()
        token = self.respond(data, '佐藤花子', ['ok', 'ok']).json()['edit_token']
        response = self.respond(data, '佐藤花子', ['ng', 'ng'], edit_token=token)
        self.assertEqual(response.status_code, 200)
        participant = Participant.objects.get(name='佐藤花子')
        self.assertEqual(set(participant.attendances.values_list('status', flat=True)), {'ng'})

    def test_invalid_edit_token(self):
        data = self.create_schedule()
        response = self.respond(data, 'a', ['ok', 'ok'], edit_token='not-a-uuid')
        self.assertEqual(response.status_code, 400)

    def test_duplicate_name_rejected(self):
        data = self.create_schedule()
        self.respond(data, '佐藤', ['ok', 'ok'])
        response = self.respond(data, '佐藤', ['ok', 'ok'])
        self.assertEqual(response.status_code, 400)

    def test_candidate_from_other_schedule_rejected(self):
        data = self.create_schedule()
        other = self.create_schedule()
        response = self.client.post(self.url(data, 'respond/'), {
            'name': 'x',
            'attendances': [{'candidate': other['candidates'][0]['id'], 'status': 'ok'}],
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_maybe_rejected_when_not_allowed(self):
        data = self.create_schedule(allow_maybe=False)
        response = self.respond(data, 'x', ['maybe', 'ok'])
        self.assertEqual(response.status_code, 400)

    def test_cannot_respond_after_finalize(self):
        data = self.create_schedule()
        self.client.post(self.url(data, 'finalize/'), {
            'candidate_id': data['candidates'][0]['id'], 'edit_key': EDIT_KEY,
        }, format='json')
        response = self.respond(data, 'x', ['ok', 'ok'])
        self.assertEqual(response.status_code, 400)

    def test_edit_token_not_exposed_publicly(self):
        data = self.create_schedule()
        self.respond(data, 'x', ['ok', 'ok'])
        detail = self.client.get(self.url(data) + '?include_edit_token=1').content.decode()
        self.assertNotIn('edit_token', detail)
        participants = self.client.get(self.url(data, 'participants/')).content.decode()
        self.assertNotIn('edit_token', participants)


# ---------------------------------------------------------------------------
# Category 3: export_csv
# ---------------------------------------------------------------------------

class ExportCsvTests(APITestBase):
    def _csv(self, data):
        response = self.client.get(self.url(data, 'export_csv/'))
        self.assertEqual(response.status_code, 200)
        return response

    def test_export_returns_csv(self):
        data = self.create_schedule()
        response = self._csv(data)
        self.assertTrue(response['Content-Type'].startswith('text/csv'))
        self.assertIn('attachment', response['Content-Disposition'])

    def test_csv_contains_bom(self):
        data = self.create_schedule()
        self.assertTrue(self._csv(data).content.startswith(b'\xef\xbb\xbf'))

    def test_csv_rows_and_local_time(self):
        data = self.create_schedule()
        self.respond(data, '佐藤', ['ok', 'maybe'], comment='よろしく')
        rows = list(csv.reader(io.StringIO(self._csv(data).content.decode('utf-8-sig'))))
        self.assertEqual(rows[0][0], '参加者')
        self.assertEqual(rows[1], ['佐藤', '◯', '△', 'よろしく'])
        self.assertEqual(rows[-1][0], '集計')
        start = timezone.localtime(Candidate.objects.filter(schedule__uuid=data['uuid']).first().start_at)
        self.assertTrue(rows[0][1].startswith(start.strftime('%Y/%m/%d %H:%M')))

    def test_csv_injection_is_neutralised(self):
        data = self.create_schedule()
        self.respond(data, '=HYPERLINK("http://evil")', ['ok', 'ok'], comment='+cmd')
        rows = list(csv.reader(io.StringIO(self._csv(data).content.decode('utf-8-sig'))))
        self.assertTrue(rows[1][0].startswith("'="))
        self.assertTrue(rows[1][-1].startswith("'+"))

    def test_content_disposition_is_sanitised(self):
        data = self.create_schedule(name='evil"\r\nSet-Cookie: x=1')
        response = self._csv(data)
        header = response['Content-Disposition']
        self.assertNotIn('\n', header)
        self.assertNotIn('\r', header)
        self.assertEqual(header.count('"'), header.count('"') // 2 * 2)

    def test_japanese_filename(self):
        data = self.create_schedule()
        self.assertIn("filename*=utf-8''", self._csv(data)['Content-Disposition'])

    def test_sanitize_helper(self):
        for prefix in ('=', '+', '-', '@', '\t', '\r'):
            self.assertEqual(_sanitize_csv_value(f'{prefix}x'), f"'{prefix}x")
        self.assertEqual(_sanitize_csv_value('safe'), 'safe')
        self.assertEqual(_sanitize_csv_value(None), '')

    def test_csv_query_count_is_constant(self):
        data = self.create_schedule(candidates=5)
        for i in range(8):
            self.respond(data, f'user{i}', ['ok'] * 5)
        with CaptureQueriesContext(connection) as ctx:
            self._csv(data)
        self.assertLessEqual(len(ctx.captured_queries), 5)


# ---------------------------------------------------------------------------
# Category 4: edit_key
# ---------------------------------------------------------------------------

class EditKeyTests(APITestBase):
    def test_edit_key_is_hashed(self):
        data = self.create_schedule()
        schedule = Schedule.objects.get(uuid=data['uuid'])
        self.assertNotEqual(schedule.edit_key, EDIT_KEY)
        identify_hasher(schedule.edit_key)  # raises if not a hash
        self.assertTrue(schedule.check_edit_key(EDIT_KEY))
        self.assertFalse(schedule.check_edit_key('wrong'))
        self.assertFalse(schedule.check_edit_key(''))

    def test_update_with_wrong_key(self):
        data = self.create_schedule()
        response = self.client.patch(self.url(data), {'name': 'x'}, format='json', HTTP_X_EDIT_KEY='wrong')
        self.assertEqual(response.status_code, 400)

    def test_update_without_key_is_rejected(self):
        data = self.create_schedule()
        response = self.client.patch(self.url(data), {'name': 'x'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_update_with_correct_key(self):
        data = self.create_schedule()
        response = self.client.patch(self.url(data), {'name': '更新後'}, format='json', HTTP_X_EDIT_KEY=EDIT_KEY)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], '更新後')

    def test_update_with_key_in_body(self):
        data = self.create_schedule()
        response = self.client.patch(self.url(data), {'name': '更新後', 'edit_key': EDIT_KEY}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_delete_with_wrong_key(self):
        data = self.create_schedule()
        response = self.client.delete(self.url(data), HTTP_X_EDIT_KEY='wrong')
        self.assertEqual(response.status_code, 403)
        self.assertTrue(Schedule.objects.filter(uuid=data['uuid']).exists())

    def test_finalize_with_wrong_key(self):
        data = self.create_schedule()
        response = self.client.post(self.url(data, 'finalize/'), {
            'candidate_id': data['candidates'][0]['id'], 'edit_key': 'wrong',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_finalize_and_unfinalize(self):
        data = self.create_schedule()
        cid = data['candidates'][1]['id']
        response = self.client.post(self.url(data, 'finalize/'), {'candidate_id': cid}, format='json',
                                    HTTP_X_EDIT_KEY=EDIT_KEY)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['is_finalized'])
        self.assertEqual(response.json()['finalized_candidate'], cid)
        response = self.client.post(self.url(data, 'finalize/'), {'candidate_id': None}, format='json',
                                    HTTP_X_EDIT_KEY=EDIT_KEY)
        self.assertFalse(response.json()['is_finalized'])

    def test_verify_edit_key(self):
        data = self.create_schedule()
        ok = self.client.post(self.url(data, 'verify_edit_key/'), {}, format='json', HTTP_X_EDIT_KEY=EDIT_KEY)
        self.assertEqual(ok.status_code, 200)
        ng = self.client.post(self.url(data, 'verify_edit_key/'), {}, format='json', HTTP_X_EDIT_KEY='nope')
        self.assertEqual(ng.status_code, 403)

    @override_settings(REST_FRAMEWORK={
        'DEFAULT_THROTTLE_CLASSES': [],
        'DEFAULT_THROTTLE_RATES': {'anon': None, 'user': None, 'edit_key': '3/hour'},
        'DEFAULT_AUTHENTICATION_CLASSES': [],
        'UNAUTHENTICATED_USER': None,
    })
    def test_verify_edit_key_is_throttled(self):
        from rest_framework.settings import api_settings
        from rest_framework.throttling import SimpleRateThrottle

        api_settings.reload()
        SimpleRateThrottle.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES
        try:
            data = self.create_schedule()
            codes = [
                self.client.post(self.url(data, 'verify_edit_key/'), {}, format='json',
                                 HTTP_X_EDIT_KEY='nope').status_code
                for _ in range(4)
            ]
            self.assertEqual(codes[-1], 429)
        finally:
            api_settings.reload()
            SimpleRateThrottle.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES

    def test_delete_participant_requires_key_or_token(self):
        data = self.create_schedule()
        token = self.respond(data, 'a', ['ok', 'ok']).json()['edit_token']
        self.respond(data, 'b', ['ok', 'ok'])
        a = Participant.objects.get(name='a')
        b = Participant.objects.get(name='b')

        denied = self.client.delete(self.url(data, f'participants/{a.id}/'))
        self.assertEqual(denied.status_code, 403)
        by_token = self.client.delete(self.url(data, f'participants/{a.id}/'), {'edit_token': token}, format='json')
        self.assertEqual(by_token.status_code, 204)
        by_key = self.client.delete(self.url(data, f'participants/{b.id}/'), HTTP_X_EDIT_KEY=EDIT_KEY)
        self.assertEqual(by_key.status_code, 204)


# ---------------------------------------------------------------------------
# Security regressions (docs/08_security.md)
# ---------------------------------------------------------------------------

class SecurityTests(APITestBase):
    def test_list_endpoint_is_disabled(self):
        self.create_schedule()
        response = self.client.get('/api/v1/schedules/')
        self.assertEqual(response.status_code, 405)

    def test_owner_email_not_exposed(self):
        data = self.create_schedule(owner_email='owner@example.com')
        self.assertEqual(Schedule.objects.get(uuid=data['uuid']).owner_email, 'owner@example.com')
        body = self.client.get(self.url(data)).content.decode()
        self.assertNotIn('owner@example.com', body)
        self.assertNotIn('owner_email', body)
        self.assertNotIn('notify_on_response', body)
        self.assertNotIn('show_participant_count', body)

    def test_hidden_settings_are_not_writable(self):
        data = self.create_schedule(notify_on_response=True, show_participant_count=False)
        schedule = Schedule.objects.get(uuid=data['uuid'])
        self.assertFalse(schedule.notify_on_response)
        self.assertTrue(schedule.show_participant_count)

    def test_api_robots_txt(self):
        response = self.client.get('/robots.txt')
        self.assertContains(response, 'Disallow: /')

    def test_health(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.json(), {'status': 'ok'})


# ---------------------------------------------------------------------------
# Phase 1a: ICS export
# ---------------------------------------------------------------------------

class ExportIcsTests(APITestBase):
    def _ics(self, data, query=''):
        response = self.client.get(self.url(data, f'export_ics/{query}'))
        self.assertEqual(response.status_code, 200, response.content)
        return response

    def test_export_all_candidates(self):
        data = self.create_schedule(candidates=3)
        body = self._ics(data).content.decode()
        self.assertEqual(body.count('BEGIN:VEVENT'), 3)
        self.assertIn('STATUS:TENTATIVE', body)
        self.assertTrue(body.startswith('BEGIN:VCALENDAR\r\n'))
        self.assertTrue(body.endswith('END:VCALENDAR\r\n'))

    def test_export_single_candidate(self):
        data = self.create_schedule(candidates=3)
        cid = data['candidates'][1]['id']
        body = self._ics(data, f'?candidate_id={cid}').content.decode()
        self.assertEqual(body.count('BEGIN:VEVENT'), 1)
        self.assertIn(f"UID:{data['uuid']}-{cid}@scheduling-tool", body)

    def test_export_unknown_candidate(self):
        data = self.create_schedule()
        response = self.client.get(self.url(data, 'export_ics/?candidate_id=999999'))
        self.assertEqual(response.status_code, 404)

    def test_export_finalized(self):
        data = self.create_schedule(candidates=3)
        cid = data['candidates'][2]['id']
        self.client.post(self.url(data, 'finalize/'), {'candidate_id': cid, 'edit_key': EDIT_KEY}, format='json')
        body = self._ics(data).content.decode()
        self.assertEqual(body.count('BEGIN:VEVENT'), 1)
        self.assertIn('STATUS:CONFIRMED', body)
        self.assertIn(f"-{cid}@scheduling-tool", body)

    def test_ics_content_type(self):
        data = self.create_schedule()
        response = self._ics(data)
        self.assertTrue(response['Content-Type'].startswith('text/calendar'))
        self.assertIn('.ics', response['Content-Disposition'])

    def test_ics_datetimes_are_utc(self):
        data = self.create_schedule(candidates=1)
        candidate = Candidate.objects.get(schedule__uuid=data['uuid'])
        body = self._ics(data).content.decode()
        expected = candidate.start_at.astimezone(dt_timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        self.assertIn(f'DTSTART:{expected}', body)

    def test_ics_sanitization(self):
        self.assertEqual(_sanitize_ics_value('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne')
        data = self.create_schedule(name='飲み会, 二次会; 打ち上げ')
        body = self._ics(data).content.decode().replace('\r\n ', '')
        self.assertIn('SUMMARY:飲み会\\, 二次会\\; 打ち上げ', body)

    def test_ics_lines_are_folded(self):
        data = self.create_schedule(description='あ' * 200)
        for line in self._ics(data).content.split(b'\r\n'):
            self.assertLessEqual(len(line), 75)
        folded = _fold_ics_line('DESCRIPTION:' + 'あ' * 50)
        self.assertEqual(folded.replace('\r\n ', ''), 'DESCRIPTION:' + 'あ' * 50)


# ---------------------------------------------------------------------------
# Phase 1a: summary / recommendation
# ---------------------------------------------------------------------------

class SummaryTests(APITestBase):
    def _summary(self, data):
        response = self.client.get(self.url(data, 'summary/'))
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_is_recommended_flag(self):
        data = self.create_schedule(candidates=3)
        self.respond(data, 'a', ['ok', 'ng', 'maybe'])
        self.respond(data, 'b', ['ok', 'maybe', 'ng'])
        summary = self._summary(data)
        flags = [c['is_recommended'] for c in summary['candidates']]
        self.assertEqual(flags, [True, False, False])
        self.assertEqual(summary['candidates'][0]['score'], 4)
        self.assertEqual(summary['recommended_candidate']['candidate_id'], data['candidates'][0]['id'])
        self.assertEqual(summary['total_participants'], 2)

    def test_single_candidate(self):
        data = self.create_schedule(candidates=1)
        self.respond(data, 'a', ['maybe'])
        summary = self._summary(data)
        self.assertTrue(summary['candidates'][0]['is_recommended'])

    def test_tie_score(self):
        """同点の場合は表示順が先の候補のみをおすすめにする"""
        data = self.create_schedule(candidates=2)
        self.respond(data, 'a', ['ok', 'ok'])
        summary = self._summary(data)
        self.assertEqual([c['is_recommended'] for c in summary['candidates']], [True, False])

    def test_no_recommendation_without_positive_answers(self):
        data = self.create_schedule(candidates=2)
        self.assertIsNone(self._summary(data)['recommended_candidate'])
        self.respond(data, 'a', ['ng', 'ng'])
        summary = self._summary(data)
        self.assertIsNone(summary['recommended_candidate'])
        self.assertFalse(any(c['is_recommended'] for c in summary['candidates']))

    def test_summary_query_count_is_constant(self):
        data = self.create_schedule(candidates=10)
        for i in range(3):
            self.respond(data, f'u{i}', ['ok'] * 10)
        with CaptureQueriesContext(connection) as ctx:
            self._summary(data)
        self.assertLessEqual(len(ctx.captured_queries), 3)


# ---------------------------------------------------------------------------
# Phase 1a: Candidate edit_key checks
# ---------------------------------------------------------------------------

class CandidateEditKeyTests(APITestBase):
    def _new_candidate(self):
        return {'start_at': future(10).isoformat(), 'end_at': future(10, 2).isoformat()}

    def test_add_candidate_with_correct_key(self):
        data = self.create_schedule()
        response = self.client.post(self.url(data, 'candidates/'), self._new_candidate(),
                                    format='json', HTTP_X_EDIT_KEY=EDIT_KEY)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Candidate.objects.filter(schedule__uuid=data['uuid']).count(), 3)
        self.assertEqual(Candidate.objects.get(pk=response.json()['id']).order, 2)

    def test_add_candidate_with_wrong_key(self):
        data = self.create_schedule()
        response = self.client.post(self.url(data, 'candidates/'), self._new_candidate(),
                                    format='json', HTTP_X_EDIT_KEY='wrong')
        self.assertEqual(response.status_code, 403)

    def test_delete_candidate_with_correct_key(self):
        data = self.create_schedule()
        cid = data['candidates'][0]['id']
        response = self.client.delete(self.url(data, f'candidates/{cid}/'), HTTP_X_EDIT_KEY=EDIT_KEY)
        self.assertEqual(response.status_code, 204)

    def test_delete_candidate_with_wrong_key(self):
        data = self.create_schedule()
        cid = data['candidates'][0]['id']
        response = self.client.delete(self.url(data, f'candidates/{cid}/'), HTTP_X_EDIT_KEY='wrong')
        self.assertEqual(response.status_code, 403)

    def test_add_candidate_no_edit_key_schedule(self):
        """edit_key未入力で作成したイベントは自動生成キーが必要"""
        data = self.create_schedule(edit_key=None)
        denied = self.client.post(self.url(data, 'candidates/'), self._new_candidate(), format='json')
        self.assertEqual(denied.status_code, 403)
        allowed = self.client.post(self.url(data, 'candidates/'), self._new_candidate(),
                                   format='json', HTTP_X_EDIT_KEY=data['_edit_key'])
        self.assertEqual(allowed.status_code, 201)

    def test_cannot_delete_last_candidate(self):
        data = self.create_schedule(candidates=1)
        cid = data['candidates'][0]['id']
        response = self.client.delete(self.url(data, f'candidates/{cid}/'), HTTP_X_EDIT_KEY=EDIT_KEY)
        self.assertEqual(response.status_code, 400)

    def test_deleting_finalized_candidate_unfinalizes(self):
        data = self.create_schedule()
        cid = data['candidates'][0]['id']
        self.client.post(self.url(data, 'finalize/'), {'candidate_id': cid}, format='json', HTTP_X_EDIT_KEY=EDIT_KEY)
        self.client.delete(self.url(data, f'candidates/{cid}/'), HTTP_X_EDIT_KEY=EDIT_KEY)
        schedule = Schedule.objects.get(uuid=data['uuid'])
        self.assertFalse(schedule.is_finalized)
        self.assertIsNone(schedule.finalized_candidate)

    def test_deleting_candidate_removes_attendances(self):
        data = self.create_schedule()
        self.respond(data, 'a', ['ok', 'ok'])
        cid = data['candidates'][0]['id']
        self.client.delete(self.url(data, f'candidates/{cid}/'), HTTP_X_EDIT_KEY=EDIT_KEY)
        self.assertEqual(Attendance.objects.filter(candidate_id=cid).count(), 0)

    def test_list_candidates_is_public(self):
        data = self.create_schedule()
        response = self.client.get(self.url(data, 'candidates/'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)


class ThrottleBypassTests(APITestBase):
    @override_settings(INTERNAL_API_TOKEN='internal-secret')
    def test_internal_token_bypasses_anon_throttle(self):
        from .throttling import _is_internal_request
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        self.assertTrue(_is_internal_request(factory.get('/', HTTP_X_INTERNAL_TOKEN='internal-secret')))
        self.assertFalse(_is_internal_request(factory.get('/', HTTP_X_INTERNAL_TOKEN='wrong')))
        self.assertFalse(_is_internal_request(factory.get('/')))

    def test_no_bypass_when_token_unset(self):
        from .throttling import _is_internal_request
        from rest_framework.test import APIRequestFactory

        self.assertFalse(_is_internal_request(APIRequestFactory().get('/', HTTP_X_INTERNAL_TOKEN='')))
