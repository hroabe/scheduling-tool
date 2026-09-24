import { ApiClient, ApiError, extractErrorMessage } from '../src/api/client';

interface Call {
    url: string;
    init: RequestInit;
    headers: Record<string, string>;
    body: unknown;
}

function jsonResponse(status: number, data: unknown): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => (data === undefined ? '' : JSON.stringify(data)),
    } as Response;
}

function setup(opts: { token?: string | null; responses?: Response[] } = {}) {
    const calls: Call[] = [];
    const queue = [...(opts.responses ?? [])];
    let token = opts.token ?? null;
    const onUnauthorized = jest.fn(() => {
        token = null;
    });
    const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        calls.push({
            url: String(url),
            init: init ?? {},
            headers: (init?.headers ?? {}) as Record<string, string>,
            body: init?.body ? JSON.parse(String(init.body)) : undefined,
        });
        return queue.shift() ?? jsonResponse(200, {});
    });
    const client = new ApiClient({
        baseUrl: 'http://api.test/',
        getToken: () => token,
        onUnauthorized,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        getLanguage: () => 'ja',
    });
    return { client, calls, onUnauthorized };
}

const SECRET = 'S3CRET-value';

describe('ApiClient headers & auth', () => {
    it('logs in with issue_token and never sends cookies or an Authorization header', async () => {
        const { client, calls } = setup({
            token: 'stale',
            responses: [jsonResponse(200, { user: { id: 1 }, token: 'tok', message: 'ok' })],
        });
        const res = await client.login('alice', 'pw');
        expect(res.token).toBe('tok');
        expect(calls[0].url).toBe('http://api.test/api/v1/accounts/login/');
        expect(calls[0].init.method).toBe('POST');
        expect(calls[0].init.credentials).toBe('omit');
        expect(calls[0].body).toEqual({ username: 'alice', password: 'pw', issue_token: true });
        expect(calls[0].headers.Authorization).toBeUndefined();
        expect(calls[0].headers['Content-Type']).toBe('application/json');
        expect(calls[0].headers['Accept-Language']).toBe('ja');
    });

    it('registers with issue_token', async () => {
        const { client, calls } = setup();
        await client.register({ username: 'a', email: 'a@example.com', password: 'p', password_confirm: 'p' });
        expect(calls[0].body).toMatchObject({ username: 'a', issue_token: true });
    });

    it('sends "Authorization: Token <key>" when logged in', async () => {
        const { client, calls } = setup({ token: 'abc123' });
        await client.me();
        await client.mySchedules();
        await client.hostBookings(2);
        expect(calls.map((c) => c.headers.Authorization)).toEqual(['Token abc123', 'Token abc123', 'Token abc123']);
        expect(calls[1].url).toBe('http://api.test/api/v1/accounts/me/schedules/?page=1');
        expect(calls[2].url).toBe('http://api.test/api/v1/oneonone/bookings/?page=2');
        expect(calls.every((c) => c.init.credentials === 'omit')).toBe(true);
    });

    it('does not set Content-Type on bodiless GET requests', async () => {
        const { client, calls } = setup();
        await client.getSchedule('11111111-2222-3333-4444-555555555555');
        expect(calls[0].headers['Content-Type']).toBeUndefined();
        expect(calls[0].init.body).toBeUndefined();
    });

    it('logout posts with the token (server revokes it)', async () => {
        const { client, calls } = setup({ token: 'abc' });
        await client.logout();
        expect(calls[0].url).toBe('http://api.test/api/v1/accounts/logout/');
        expect(calls[0].headers.Authorization).toBe('Token abc');
    });

    it('drops a rejected token and retries anonymously', async () => {
        const { client, calls, onUnauthorized } = setup({
            token: 'revoked',
            responses: [jsonResponse(401, { detail: 'Invalid token.' }), jsonResponse(200, { uuid: 'x' })],
        });
        await client.getSchedule('11111111-2222-3333-4444-555555555555');
        expect(onUnauthorized).toHaveBeenCalledTimes(1);
        expect(calls).toHaveLength(2);
        expect(calls[0].headers.Authorization).toBe('Token revoked');
        expect(calls[1].headers.Authorization).toBeUndefined();
    });

    it('treats a 403 as a rejected token when /accounts/me/ also refuses it (SessionAuthentication-first API)', async () => {
        const { client, calls, onUnauthorized } = setup({
            token: 'revoked',
            responses: [
                jsonResponse(403, { detail: 'Invalid token.' }),
                jsonResponse(403, { detail: 'Invalid token.' }),
                jsonResponse(200, { uuid: 'x' }),
            ],
        });
        await client.getSchedule('11111111-2222-3333-4444-555555555555');
        expect(onUnauthorized).toHaveBeenCalledTimes(1);
        expect(calls.map((c) => c.url.replace('http://api.test', ''))).toEqual([
            '/api/v1/schedules/11111111-2222-3333-4444-555555555555/',
            '/api/v1/accounts/me/',
            '/api/v1/schedules/11111111-2222-3333-4444-555555555555/',
        ]);
        expect(calls[2].headers.Authorization).toBeUndefined();
    });

    it('keeps a valid token on a genuine 403 (e.g. wrong edit key)', async () => {
        const { client, calls, onUnauthorized } = setup({
            token: 'good',
            responses: [jsonResponse(403, { detail: '編集キーが正しくありません。' }), jsonResponse(200, { id: 1 })],
        });
        const error = await client.close('u', 'wrong').catch((e) => e);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(403);
        expect(error.message).toBe('編集キーが正しくありません。');
        expect(onUnauthorized).not.toHaveBeenCalled();
        expect(calls).toHaveLength(2);
    });

    it('a 403 from /accounts/me/ itself means the token is invalid', async () => {
        const { client, calls, onUnauthorized } = setup({
            token: 'revoked',
            responses: [jsonResponse(403, { detail: 'Invalid token.' }), jsonResponse(403, { detail: 'no creds' })],
        });
        await expect(client.me()).rejects.toMatchObject({ status: 403 });
        expect(onUnauthorized).toHaveBeenCalledTimes(1);
        expect(calls).toHaveLength(2);
        expect(calls[1].headers.Authorization).toBeUndefined();
    });

    it('does not retry a 401 when no token was sent', async () => {
        const { client, calls, onUnauthorized } = setup({ responses: [jsonResponse(401, { detail: 'nope' })] });
        await expect(client.me()).rejects.toBeInstanceOf(ApiError);
        expect(onUnauthorized).not.toHaveBeenCalled();
        expect(calls).toHaveLength(1);
    });

    it('guest booking endpoints never send the auth token', async () => {
        const { client, calls } = setup({ token: 'abc' });
        await client.getPublicBookingPage('my-page-1a2b');
        await client.reserve('my-page-1a2b', { slot: 3, guest_name: 'G', guest_email: 'g@example.com' });
        expect(calls.every((c) => c.headers.Authorization === undefined)).toBe(true);
        expect(calls[1].url).toBe('http://api.test/api/v1/oneonone/booking/my-page-1a2b/reserve/');
    });
});

describe('ApiClient secrets stay out of URLs', () => {
    const uuid = '11111111-2222-3333-4444-555555555555';

    it('edit key goes in X-Edit-Key for every management call', async () => {
        const { client, calls } = setup();
        await client.finalize(uuid, 7, SECRET);
        await client.finalize(uuid, null, SECRET);
        await client.close(uuid, SECRET);
        await client.reopen(uuid, SECRET);
        await client.updateSchedule(uuid, { name: 'n' }, SECRET);
        await client.deleteSchedule(uuid, SECRET);
        await client.verifyEditKey(uuid, SECRET);
        await client.deleteParticipant(uuid, 4, { editKey: SECRET });
        for (const call of calls) {
            expect(call.headers['X-Edit-Key']).toBe(SECRET);
            expect(call.url).not.toContain(SECRET);
            expect(call.url).not.toContain('?');
            expect(JSON.stringify(call.body ?? {})).not.toContain(SECRET);
        }
        expect(calls[0].body).toEqual({ candidate_id: 7 });
        expect(calls[1].body).toEqual({ candidate_id: null });
        expect(calls[5].init.method).toBe('DELETE');
    });

    it('response edit token goes in X-Edit-Token', async () => {
        const { client, calls } = setup();
        const input = { name: 'Bob', attendances: [{ candidate: 1, status: 'ok' as const }] };
        await client.respond(uuid, input, `12.${SECRET}`);
        await client.deleteParticipant(uuid, 12, { editToken: `12.${SECRET}` });
        for (const call of calls) {
            expect(call.headers['X-Edit-Token']).toBe(`12.${SECRET}`);
            expect(call.url).not.toContain(SECRET);
            expect(JSON.stringify(call.body ?? {})).not.toContain(SECRET);
        }
        expect(calls[0].url).toBe(`http://api.test/api/v1/schedules/${uuid}/respond/`);
        expect(calls[0].body).toEqual(input);
    });

    it('a new response sends no edit token header', async () => {
        const { client, calls } = setup({
            responses: [jsonResponse(201, { id: 12, name: 'Bob', edit_token: '12.abc' })],
        });
        const res = await client.respond(uuid, { name: 'Bob', attendances: [] });
        expect(res.edit_token).toBe('12.abc');
        expect(calls[0].headers['X-Edit-Token']).toBeUndefined();
    });

    it('booking cancel token goes in the JSON body', async () => {
        const { client, calls } = setup();
        await client.cancelBooking('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', SECRET);
        expect(calls[0].url).toBe('http://api.test/api/v1/oneonone/booking/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/cancel/');
        expect(calls[0].url).not.toContain(SECRET);
        expect(calls[0].body).toEqual({ cancel_token: SECRET });
    });

    it('host booking actions use the booking uuid', async () => {
        const { client, calls } = setup({ token: 't' });
        await client.confirmHostBooking('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
        await client.cancelHostBooking('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
        expect(calls[0].url).toBe('http://api.test/api/v1/oneonone/bookings/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/confirm/');
        expect(calls[1].url).toBe('http://api.test/api/v1/oneonone/bookings/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/cancel/');
        expect(calls.every((c) => !c.url.includes('NaN'))).toBe(true);
    });

    it('export URLs are public and secret-free', () => {
        const { client } = setup({ token: SECRET });
        expect(client.exportCsvUrl(uuid)).toBe(`http://api.test/api/v1/schedules/${uuid}/export_csv/`);
        expect(client.exportIcsUrl(uuid)).toBe(`http://api.test/api/v1/schedules/${uuid}/export_ics/`);
        expect(client.exportIcsUrl(uuid, 9)).toBe(`http://api.test/api/v1/schedules/${uuid}/export_ics/?candidate_id=9`);
    });

    it('1-on-1 owner endpoints match the API routes', async () => {
        const { client, calls } = setup({ token: 't' });
        await client.listPages();
        await client.getPage(5);
        await client.addSlots(5, [{ start_at: 'a', end_at: 'b' }]);
        await client.deleteSlot(5, 9);
        await client.pageBookings(5);
        expect(calls.map((c) => `${c.init.method} ${c.url.replace('http://api.test', '')}`)).toEqual([
            'GET /api/v1/oneonone/pages/?page=1',
            'GET /api/v1/oneonone/pages/5/',
            'POST /api/v1/oneonone/pages/5/add_slots/',
            'DELETE /api/v1/oneonone/pages/5/slots/9/',
            'GET /api/v1/oneonone/pages/5/bookings/',
        ]);
    });
});

describe('errors', () => {
    it('ApiError carries status, message and field errors', async () => {
        const { client } = setup({
            responses: [jsonResponse(400, { name: ['この名前は既に登録されています。'], attendances: ['x'] })],
        });
        const error = await client.respond('u', { name: 'dup', attendances: [] }).catch((e) => e);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(400);
        expect(error.fieldErrors.name).toBe('この名前は既に登録されています。');
        expect(error.message).toContain('この名前');
    });

    it('extractErrorMessage prefers detail / error / non_field_errors', () => {
        expect(extractErrorMessage({ detail: 'd' })).toBe('d');
        expect(extractErrorMessage({ error: 'e' })).toBe('e');
        expect(extractErrorMessage({ non_field_errors: ['n1', 'n2'] })).toBe('n1 n2');
        expect(extractErrorMessage(null)).toBeNull();
    });

    it('handles empty (204) bodies', async () => {
        const { client } = setup({ responses: [jsonResponse(204, undefined)] });
        await expect(client.deleteSchedule('u', 'k')).resolves.toBeNull();
    });
});
