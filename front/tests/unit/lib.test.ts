import { afterEach, describe, expect, test, vi } from 'vitest';
import { ApiClient, ApiError, extractErrorMessage } from '@/lib/api';
import { formatDateRange, googleCalendarUrl, isDeadlinePassed, localInputToISO, minutesBetween } from '@/lib/date';

describe('extractErrorMessage', () => {
    test('detail を優先する', () => {
        expect(extractErrorMessage({ detail: '編集キーが正しくありません。' })).toBe('編集キーが正しくありません。');
    });
    test('フィールドエラーの最初のメッセージを返す', () => {
        expect(extractErrorMessage({ name: ['この名前は既に登録されています。'] })).toBe('この名前は既に登録されています。');
        expect(extractErrorMessage({ attendances: [{ candidate: ['不正です'] }] })).toBe('不正です');
    });
    test('空なら undefined', () => {
        expect(extractErrorMessage({})).toBeUndefined();
        expect(extractErrorMessage(null)).toBeUndefined();
    });
});

describe('ApiClient', () => {
    afterEach(() => vi.unstubAllGlobals());

    test('編集キーは X-Edit-Key ヘッダーで送る（クエリに載せない）', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ uuid: 'x' }), { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        await new ApiClient('http://api.test').updateSchedule('x', { name: 'n' }, 'secret');
        // The first request bootstraps the CSRF cookie for unsafe methods
        expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/v1/accounts/csrf/');
        const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
        expect(url).toBe('http://api.test/api/v1/schedules/x/');
        expect(url).not.toContain('secret');
        expect((init.headers as Record<string, string>)['X-Edit-Key']).toBe('secret');
        expect(init.method).toBe('PATCH');
    });

    test('verifyEditKey は 403 で false を返す', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'ng' }), { status: 403 })));
        await expect(new ApiClient('http://api.test').verifyEditKey('x', 'bad')).resolves.toBe(false);
    });

    test('エラー時は ApiError を投げる', async () => {
        vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('{}', { status: 429 })));
        const client = new ApiClient('http://api.test');
        await expect(client.getSchedule('x')).rejects.toBeInstanceOf(ApiError);
        await expect(client.getSchedule('x')).rejects.toThrow(/アクセスが集中/);
    });

    test('エクスポートURLを組み立てる', () => {
        const client = new ApiClient('http://api.test');
        expect(client.exportIcsUrl('u', 5)).toBe('http://api.test/api/v1/schedules/u/export_ics/?candidate_id=5');
        expect(client.exportCsvUrl('u')).toBe('http://api.test/api/v1/schedules/u/export_csv/?include_comments=true');
    });
});

describe('date utils', () => {
    test('googleCalendarUrl は UTC の dates を含む', () => {
        const url = googleCalendarUrl({ title: '会議', start: '2030-01-01T01:00:00Z', end: '2030-01-01T02:00:00Z' });
        expect(url).toContain('dates=20300101T010000Z%2F20300101T020000Z');
        expect(url).toContain('action=TEMPLATE');
    });
    test('minutesBetween', () => {
        expect(minutesBetween('10:00', '11:30')).toBe(90);
        expect(minutesBetween('11:00', '10:00')).toBe(-60);
    });
    test('isDeadlinePassed', () => {
        expect(isDeadlinePassed(null)).toBe(false);
        expect(isDeadlinePassed('2000-01-01T00:00:00Z')).toBe(true);
        expect(isDeadlinePassed('2999-01-01T00:00:00Z')).toBe(false);
    });
    test('localInputToISO', () => {
        expect(localInputToISO('')).toBeNull();
        expect(localInputToISO('2030-01-01T10:00')).toBe(new Date(2030, 0, 1, 10, 0).toISOString());
    });
    test('formatDateRange は同日なら終了日付を省略する', () => {
        const start = new Date(2030, 0, 1, 10, 0).toISOString();
        const end = new Date(2030, 0, 1, 11, 0).toISOString();
        expect(formatDateRange(start, end)).toBe('2030/01/01 (火) 10:00 - 11:00');
    });
});
