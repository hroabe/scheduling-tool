import type { Candidate } from '../src/api/types';
import { resolveApiUrl, resolveWebUrl } from '../src/config';
import { parseLocalInput } from '../src/lib/date';
import { parseUserInput, pathFromUrl, routeFromPath, routeFromUrl } from '../src/lib/links';
import { isValidSlug, slugifyAscii, suggestSlug } from '../src/lib/slug';
import { buildSlots } from '../src/lib/slots';
import { scoreCandidates } from '../src/lib/summary';
import { getAvailabilitySymbols } from '../src/lib/symbols';
import { mergeRecent, participantIdFromToken, type RecentEvent } from '../src/stores/localEvents';
import { buildTheme, resolveScheme } from '../src/theme/palette';

const UUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('deep links', () => {
    it.each([
        [`schedulingtool://event/${UUID}`, { name: 'EventDetail', params: { uuid: UUID } }],
        [`https://chousei.example.com/event/${UUID}`, { name: 'EventDetail', params: { uuid: UUID } }],
        [`https://chousei.example.com/event/${UUID}/edit`, { name: 'EventDetail', params: { uuid: UUID } }],
        [`https://chousei.example.com/event/${UUID.toUpperCase()}?x=1#y`, { name: 'EventDetail', params: { uuid: UUID } }],
        ['schedulingtool://booking/consult-1a2b3c', { name: 'Booking', params: { slug: 'consult-1a2b3c' } }],
        ['http://localhost:3000/booking/consult-1a2b3c/done', { name: 'Booking', params: { slug: 'consult-1a2b3c' } }],
        [`exp://192.168.0.2:8081/--/event/${UUID}`, { name: 'EventDetail', params: { uuid: UUID } }],
        ['schedulingtool://create', { name: 'CreateEvent' }],
    ])('%s', (url, expected) => {
        expect(routeFromUrl(url)).toEqual(expected);
    });

    it.each([
        'https://host/booking/cancel?booking=x&token=y',
        'https://host/booking/verify?slug=a&token=b',
        'https://host/booking/new',
        'https://host/booking/slug-abc/host',
        'https://host/event/not-a-uuid',
        'https://host/',
        'schedulingtool://',
    ])('ignores %s', (url) => {
        expect(routeFromUrl(url)).toBeNull();
    });

    it('extracts paths', () => {
        expect(pathFromUrl('schedulingtool://event/abc')).toBe('/event/abc');
        expect(pathFromUrl('https://h.example/event/abc?x')).toBe('/event/abc');
        expect(routeFromPath(`event/${UUID}`)).toEqual({ name: 'EventDetail', params: { uuid: UUID } });
    });

    it('parses pasted text', () => {
        expect(parseUserInput(`  ${UUID} `)).toEqual({ name: 'EventDetail', params: { uuid: UUID } });
        expect(parseUserInput(`Please answer: https://x.example/event/${UUID} thanks`)).toEqual({
            name: 'EventDetail',
            params: { uuid: UUID },
        });
        expect(parseUserInput('hello')).toBeNull();
        expect(parseUserInput('')).toBeNull();
    });
});

describe('config', () => {
    it('prefers env, then extra, then Metro host, then platform defaults', () => {
        expect(resolveApiUrl({ envUrl: 'https://api.example.com/', extraUrl: 'x', platform: 'ios' })).toBe('https://api.example.com');
        expect(resolveApiUrl({ envUrl: '', extraUrl: 'https://b.example', platform: 'ios' })).toBe('https://b.example');
        expect(resolveApiUrl({ platform: 'android', hostUri: '192.168.1.5:8081' })).toBe('http://192.168.1.5:8000');
        expect(resolveApiUrl({ platform: 'android', hostUri: 'localhost:8081' })).toBe('http://10.0.2.2:8000');
        expect(resolveApiUrl({ platform: 'android' })).toBe('http://10.0.2.2:8000');
        expect(resolveApiUrl({ platform: 'ios' })).toBe('http://localhost:8000');
        expect(resolveApiUrl({ platform: 'web', hostUri: '192.168.1.5:8081' })).toBe('http://localhost:8000');
        expect(resolveWebUrl(undefined, 'https://w.example/')).toBe('https://w.example');
        expect(resolveWebUrl()).toBe('http://localhost:3000');
    });
});

describe('local event storage helpers', () => {
    const entry = (uuid: string, role: RecentEvent['role']): RecentEvent => ({ uuid, name: uuid, role, visitedAt: '' });

    it('moves an event to the top without downgrading its role', () => {
        const list = [entry('a', 'viewer'), entry('b', 'owner')];
        const merged = mergeRecent(list, entry('b', 'viewer'));
        expect(merged.map((e) => e.uuid)).toEqual(['b', 'a']);
        expect(merged[0].role).toBe('owner');
        expect(mergeRecent(list, entry('a', 'participant'))[0].role).toBe('participant');
    });

    it('caps the list', () => {
        let list: RecentEvent[] = [];
        for (let i = 0; i < 40; i += 1) list = mergeRecent(list, entry(String(i), 'viewer'));
        expect(list).toHaveLength(30);
        expect(list[0].uuid).toBe('39');
    });

    it('reads the participant id from "<id>.<secret>" tokens', () => {
        expect(participantIdFromToken('42.abcDEF-_')).toBe(42);
        expect(participantIdFromToken(UUID)).toBeNull();
        expect(participantIdFromToken('x.y')).toBeNull();
    });
});

describe('summary', () => {
    const c = (id: number, order: number, ok: number, maybe: number): Candidate => ({
        id,
        order,
        start_at: `2030-01-0${id}T10:00:00Z`,
        end_at: `2030-01-0${id}T11:00:00Z`,
        note: '',
        ok_count: ok,
        maybe_count: maybe,
        ng_count: 0,
        created_at: '',
    });

    it('recommends the best score, earliest on ties', () => {
        const scores = scoreCandidates([c(2, 1, 1, 1), c(1, 0, 1, 1), c(3, 2, 0, 2)]);
        expect(scores.map((s) => [s.candidate.id, s.score, s.isRecommended])).toEqual([
            [1, 3, true],
            [2, 3, false],
            [3, 2, false],
        ]);
    });

    it('recommends nothing without positive answers', () => {
        expect(scoreCandidates([c(1, 0, 0, 0)]).some((s) => s.isRecommended)).toBe(false);
    });
});

describe('misc helpers', () => {
    it('builds ASCII slugs', () => {
        expect(slugifyAscii('Café Meeting!! 2024')).toBe('cafe-meeting-2024');
        expect(suggestSlug('相談', 'abc123')).toBe('meeting-abc123');
        expect(isValidSlug('consult-abc123')).toBe(true);
        expect(isValidSlug('ab')).toBe(false);
        expect(isValidSlug('日本語')).toBe(false);
        expect(isValidSlug('-bad')).toBe(false);
    });

    it('builds back-to-back slots', () => {
        const start = new Date('2030-01-01T10:00:00Z');
        expect(buildSlots(start, 2, 30, 10)).toEqual([
            { start_at: '2030-01-01T10:00:00.000Z', end_at: '2030-01-01T10:30:00.000Z' },
            { start_at: '2030-01-01T10:40:00.000Z', end_at: '2030-01-01T11:10:00.000Z' },
        ]);
    });

    it('parses web date/time input', () => {
        const base = new Date(2030, 0, 1, 9, 0);
        const d = parseLocalInput('2030-02-03 14:30', 'datetime', base)!;
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2030, 1, 3, 14, 30]);
        expect(parseLocalInput('25:00', 'time', base)).toBeNull();
        expect(parseLocalInput('2030-02-30', 'date', base)).toBeNull();
        expect(parseLocalInput('nope', 'date', base)).toBeNull();
    });

    it('chooses availability symbols like the web app', () => {
        expect(getAvailabilitySymbols('ja')).toEqual({ ok: '◯', maybe: '△', ng: '×' });
        expect(getAvailabilitySymbols('en')).toEqual({ ok: '✓', maybe: '?', ng: '✗' });
        expect(getAvailabilitySymbols('en', true)).toEqual({ ok: '😊', maybe: '🤔', ng: '😢' });
    });

    it('resolves light/dark/cute themes', () => {
        expect(resolveScheme('system', 'dark')).toBe('dark');
        expect(resolveScheme('light', 'dark')).toBe('light');
        expect(resolveScheme('system', null)).toBe('light');
        expect(buildTheme('light', false).colors.primary).toBe('#0967D2');
        expect(buildTheme('dark', true).cute).toBe(true);
        expect(buildTheme('light', true).colors.primary).not.toBe(buildTheme('light', false).colors.primary);
    });
});
