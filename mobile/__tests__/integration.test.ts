/**
 * @jest-environment node
 *
 * Opt-in end-to-end check of the API client against a running Django API:
 *   API_IT_URL=http://127.0.0.1:8000 npm test -- integration
 * Skipped when API_IT_URL is not set.
 */

import { ApiClient, ApiError } from '../src/api/client';

const BASE = process.env.API_IT_URL;
const suite = BASE ? describe : describe.skip;

suite('API integration', () => {
    let token: string | null = null;
    const client = new ApiClient({
        baseUrl: BASE ?? 'http://localhost',
        getToken: () => token,
        onUnauthorized: () => {
            token = null;
        },
        fetchImpl: (...args) => fetch(...args),
    });
    const anon = new ApiClient({ baseUrl: BASE ?? 'http://localhost', fetchImpl: (...args) => fetch(...args) });
    const suffix = Date.now().toString(36);
    const day = (d: number, h: number) => {
        const date = new Date();
        date.setDate(date.getDate() + d);
        date.setHours(h, 0, 0, 0);
        return date.toISOString();
    };

    it('runs the group scheduling flow with an edit key and edit token', async () => {
        const created = await anon.createSchedule({
            name: `IT ${suffix}`,
            owner_name: 'Organizer',
            timezone_name: 'Asia/Tokyo',
            allow_maybe: true,
            candidates: [
                { start_at: day(3, 10), end_at: day(3, 11) },
                { start_at: day(4, 10), end_at: day(4, 11) },
            ],
        });
        expect(created._edit_key).toBeTruthy();
        const editKey = created._edit_key!;
        const [c1, c2] = created.candidates;

        await expect(anon.verifyEditKey(created.uuid, 'wrong-key')).rejects.toMatchObject({ status: 403 });
        expect(await anon.verifyEditKey(created.uuid, editKey)).toEqual({ valid: true, is_owner: false });

        const response = await anon.respond(created.uuid, {
            name: 'Guest',
            attendances: [
                { candidate: c1.id, status: 'ok' },
                { candidate: c2.id, status: 'maybe' },
            ],
        });
        expect(response.edit_token).toMatch(/^\d+\.\S+$/);

        const updated = await anon.respond(
            created.uuid,
            { name: 'Guest', comment: 'changed', attendances: [{ candidate: c2.id, status: 'ok' }] },
            response.edit_token,
        );
        expect(updated.edit_token).toBeUndefined();
        expect(updated.comment).toBe('changed');

        const closed = await anon.close(created.uuid, editKey);
        expect(closed.status).toBe('closed');
        expect((await anon.reopen(created.uuid, editKey)).status).toBe('open');
        await expect(anon.close(created.uuid, null)).rejects.toMatchObject({ status: 403 });

        const finalized = await anon.finalize(created.uuid, c2.id, editKey);
        expect(finalized.status).toBe('fixed');
        expect(finalized.finalized_candidate).toBe(c2.id);

        const csv = await fetch(anon.exportCsvUrl(created.uuid));
        expect(csv.status).toBe(200);
        const ics = await fetch(anon.exportIcsUrl(created.uuid));
        expect(await ics.text()).toContain('BEGIN:VCALENDAR');

        await anon.deleteParticipant(created.uuid, updated.id, { editToken: response.edit_token });
        await anon.deleteSchedule(created.uuid, editKey);
        await expect(anon.getSchedule(created.uuid)).rejects.toMatchObject({ status: 404 });
    });

    it('registers, logs in with a token, owns events and 1-on-1 pages, then logs out', async () => {
        const username = `it_${suffix}`;
        const password = `Pw-${suffix}-Strong!9`;
        const reg = await client.register({
            username,
            email: `${username}@example.com`,
            password,
            password_confirm: password,
        });
        expect(reg.token).toBeTruthy();

        // email login is case-insensitive (docs/11_integration.md §2.5)
        const login = await client.login(`${username}@EXAMPLE.com`, password);
        expect(login.token).toBeTruthy();
        token = login.token!;
        expect((await client.me()).username).toBe(username);

        // owned event: manageable without an edit key
        const owned = await client.createSchedule({
            name: `Owned ${suffix}`,
            owner_name: 'Me',
            candidates: [{ start_at: day(5, 9), end_at: day(5, 10) }],
        });
        expect(owned.is_owner).toBe(true);
        expect((await client.close(owned.uuid)).status).toBe('closed');
        const mine = await client.mySchedules();
        expect(mine.results.some((s) => s.uuid === owned.uuid)).toBe(true);

        // 1-on-1 page (authenticated API)
        const slug = `it-page-${suffix}`;
        await client.createPage({ slug, title: 'IT page', duration_minutes: 30, is_public: true });
        const pages = await client.listPages();
        const page = pages.results.find((p) => p.slug === slug)!;
        expect(page).toBeTruthy();
        const added = await client.addSlots(page.id, [
            { start_at: day(6, 10), end_at: new Date(new Date(day(6, 10)).getTime() + 30 * 60_000).toISOString() },
        ]);
        expect(added.created).toHaveLength(1);
        const slot = added.created[0];

        // guest reservation (login-free API) + host confirm by uuid
        const publicPage = await anon.getPublicBookingPage(slug);
        expect(publicPage.available_slots.map((s) => s.id)).toContain(slot.id);
        const reserved = await anon.reserve(slug, { slot: slot.id, guest_name: 'Guest', guest_email: 'guest@example.com' });
        expect(reserved.cancel_token).toBeTruthy();
        const hostBookings = await client.hostBookings();
        expect(hostBookings.results.map((b) => b.uuid)).toContain(reserved.booking.uuid);
        expect((await client.confirmHostBooking(reserved.booking.uuid)).booking.status).toBe('confirmed');
        expect((await anon.cancelBooking(reserved.booking.uuid, reserved.cancel_token)).booking.status).toBe('cancelled');

        await client.deleteSlot(page.id, slot.id);
        await client.deletePage(page.id);

        await client.logout();
        // the revoked token is rejected, dropped, and the request retried anonymously
        await expect(client.me()).rejects.toBeInstanceOf(ApiError);
        expect(token).toBeNull();
    });
});
