/**
 * API client for the Django REST API (v1).
 *
 * - Authentication: `Authorization: Token <token>` (DRF TokenAuthentication). Login/register are called
 *   with `issue_token: true`. Cookies are never used (`credentials: 'omit'`): the API puts
 *   SessionAuthentication first, so a stored session cookie would trigger CSRF checks on every POST.
 * - Secrets (edit key, response edit token, cancel token) are sent in headers or JSON bodies only —
 *   never in the URL (docs/11_integration.md §2.1, §2.2).
 * - If the stored token is rejected (401, or 403 confirmed by a /accounts/me/ probe), the client drops it
 *   and retries once anonymously so that public screens keep working.
 */

import type {
    AddSlotsResult,
    AuthResponse,
    AvailabilityPageDetail,
    AvailabilityPageInput,
    AvailabilityPageListItem,
    Booking,
    BookingActionResult,
    BookingInput,
    CreatedSchedule,
    PaginatedResponse,
    ParticipantInput,
    ProfileUpdateInput,
    PublicBookingPage,
    RegisterInput,
    RespondResult,
    ReserveResult,
    Schedule,
    ScheduleInput,
    ScheduleListItem,
    ScheduleUpdateInput,
    SlotInput,
    User,
} from './types';

const ME_PATH = '/api/v1/accounts/me/';

export type HttpMethod ='GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions {
    method?: HttpMethod;
    body?: unknown;
    /** Organizer edit key -> `X-Edit-Key` */
    editKey?: string | null;
    /** Response edit token -> `X-Edit-Token` */
    editToken?: string | null;
    /** Set false to never send the auth token */
    auth?: boolean;
    query?: Record<string, string | number | undefined>;
}

export interface ApiClientOptions {
    baseUrl: string;
    getToken?: () => string | null | undefined;
    /** Called when the server rejects the stored token (401) */
    onUnauthorized?: () => void;
    fetchImpl?: typeof fetch;
    /** Accept-Language header value */
    getLanguage?: () => string | null | undefined;
}

export class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(status: number, data: unknown, message?: string) {
        super(message ?? extractErrorMessage(data) ?? `HTTP ${status}`);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }

    /** Field errors, e.g. {"username": ["..."]} */
    get fieldErrors(): Record<string, string> {
        const result: Record<string, string> = {};
        if (this.data && typeof this.data === 'object' && !Array.isArray(this.data)) {
            for (const [key, value] of Object.entries(this.data as Record<string, unknown>)) {
                const text = flattenMessage(value);
                if (text) result[key] = text;
            }
        }
        return result;
    }
}

function flattenMessage(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        const parts = value.map(flattenMessage).filter((v): v is string => !!v);
        return parts.length ? parts.join(' ') : null;
    }
    if (value && typeof value === 'object') {
        const parts = Object.values(value as Record<string, unknown>)
            .map(flattenMessage)
            .filter((v): v is string => !!v);
        return parts.length ? parts.join(' ') : null;
    }
    return null;
}

/** Best human-readable message from a DRF error body */
export function extractErrorMessage(data: unknown): string | null {
    if (!data) return null;
    if (typeof data === 'string') return data.length < 300 ? data : null;
    if (typeof data !== 'object') return null;
    const record = data as Record<string, unknown>;
    for (const key of ['detail', 'error', 'non_field_errors', 'message']) {
        const text = flattenMessage(record[key]);
        if (text) return text;
    }
    return flattenMessage(record);
}

export class ApiClient {
    readonly baseUrl: string;
    private readonly options: ApiClientOptions;

    constructor(options: ApiClientOptions) {
        this.options = options;
        this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    }

    /** Absolute URL for an API path (public, secret-free URLs only) */
    url(path: string, query?: RequestOptions['query']): string {
        let url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        if (query) {
            const params = Object.entries(query)
                .filter(([, v]) => v !== undefined && v !== '')
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
            if (params.length) url += `?${params.join('&')}`;
        }
        return url;
    }

    buildHeaders(opts: RequestOptions, token: string | null | undefined): Record<string, string> {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
        if (token && opts.auth !== false) headers.Authorization = `Token ${token}`;
        if (opts.editKey) headers['X-Edit-Key'] = opts.editKey;
        if (opts.editToken) headers['X-Edit-Token'] = opts.editToken;
        const language = this.options.getLanguage?.();
        if (language) headers['Accept-Language'] = language;
        return headers;
    }

    private send(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
        const fetchImpl = this.options.fetchImpl ?? fetch;
        return fetchImpl(this.url(path, opts.query), {
            method: opts.method ?? 'GET',
            headers: this.buildHeaders(opts, token),
            body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
            credentials: 'omit',
        });
    }

    /**
     * Did the server reject the token itself? The API lists SessionAuthentication first, so DRF answers
     * an invalid/revoked token with 403 (not 401) — even on public endpoints. A 403 can also be a genuine
     * permission error (e.g. wrong edit key), so it is disambiguated with a probe of /accounts/me/.
     */
    private async tokenRejected(response: Response, path: string, token: string): Promise<boolean> {
        if (response.status === 401) return true;
        if (response.status !== 403) return false;
        if (path === ME_PATH) return true;
        try {
            const probe = await this.send(ME_PATH, {}, token);
            return probe.status === 401 || probe.status === 403;
        } catch {
            return false;
        }
    }

    async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
        const token = opts.auth === false ? null : this.options.getToken?.() ?? null;

        let response = await this.send(path, opts, token);
        if (token && (await this.tokenRejected(response, path, token))) {
            this.options.onUnauthorized?.();
            response = await this.send(path, opts, null);
        }

        const text = await response.text();
        let data: unknown = null;
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }
        if (!response.ok) throw new ApiError(response.status, data);
        return data as T;
    }

    // ------------------------------------------------------------ schedules

    getSchedule(uuid: string) {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/`);
    }

    createSchedule(input: ScheduleInput) {
        return this.request<CreatedSchedule>('/api/v1/schedules/', { method: 'POST', body: input });
    }

    updateSchedule(uuid: string, input: ScheduleUpdateInput, editKey?: string | null) {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/`, { method: 'PATCH', body: input, editKey });
    }

    deleteSchedule(uuid: string, editKey?: string | null) {
        return this.request<null>(`/api/v1/schedules/${uuid}/`, { method: 'DELETE', editKey });
    }

    verifyEditKey(uuid: string, editKey: string) {
        return this.request<{ valid: boolean; is_owner: boolean }>(`/api/v1/schedules/${uuid}/verify_edit_key/`, {
            method: 'POST',
            body: {},
            editKey,
        });
    }

    /** New response (no token) or update of an existing one (with the stored edit token) */
    respond(uuid: string, input: ParticipantInput, editToken?: string | null) {
        return this.request<RespondResult>(`/api/v1/schedules/${uuid}/respond/`, {
            method: 'POST',
            body: input,
            editToken,
        });
    }

    deleteParticipant(uuid: string, participantId: number, secrets: { editToken?: string | null; editKey?: string | null }) {
        return this.request<null>(`/api/v1/schedules/${uuid}/participants/${participantId}/`, {
            method: 'DELETE',
            editToken: secrets.editToken,
            editKey: secrets.editKey,
        });
    }

    /** candidateId = null clears the finalized date */
    finalize(uuid: string, candidateId: number | null, editKey?: string | null) {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/finalize/`, {
            method: 'POST',
            body: { candidate_id: candidateId },
            editKey,
        });
    }

    close(uuid: string, editKey?: string | null) {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/close/`, { method: 'POST', body: {}, editKey });
    }

    reopen(uuid: string, editKey?: string | null) {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/reopen/`, { method: 'POST', body: {}, editKey });
    }

    exportCsvUrl(uuid: string) {
        return this.url(`/api/v1/schedules/${uuid}/export_csv/`);
    }

    exportIcsUrl(uuid: string, candidateId?: number) {
        return this.url(`/api/v1/schedules/${uuid}/export_ics/`, { candidate_id: candidateId });
    }

    // ------------------------------------------------------------ accounts

    login(username: string, password: string) {
        return this.request<AuthResponse>('/api/v1/accounts/login/', {
            method: 'POST',
            body: { username, password, issue_token: true },
            auth: false,
        });
    }

    register(input: RegisterInput) {
        return this.request<AuthResponse>('/api/v1/accounts/register/', {
            method: 'POST',
            body: { ...input, issue_token: true },
            auth: false,
        });
    }

    logout() {
        return this.request<{ message: string }>('/api/v1/accounts/logout/', { method: 'POST', body: {} });
    }

    me() {
        return this.request<User>('/api/v1/accounts/me/');
    }

    updateMe(input: ProfileUpdateInput) {
        return this.request<User>('/api/v1/accounts/me/', { method: 'PATCH', body: input });
    }

    mySchedules(page = 1) {
        return this.request<PaginatedResponse<ScheduleListItem>>('/api/v1/accounts/me/schedules/', {
            query: { page },
        });
    }

    // ------------------------------------------------------------ 1-on-1 (authenticated owner API)

    listPages(page = 1) {
        return this.request<PaginatedResponse<AvailabilityPageListItem>>('/api/v1/oneonone/pages/', {
            query: { page },
        });
    }

    getPage(id: number) {
        return this.request<AvailabilityPageDetail>(`/api/v1/oneonone/pages/${id}/`);
    }

    createPage(input: AvailabilityPageInput) {
        return this.request<AvailabilityPageInput>('/api/v1/oneonone/pages/', { method: 'POST', body: input });
    }

    updatePage(id: number, input: Partial<AvailabilityPageInput>) {
        return this.request<AvailabilityPageInput>(`/api/v1/oneonone/pages/${id}/`, { method: 'PATCH', body: input });
    }

    deletePage(id: number) {
        return this.request<null>(`/api/v1/oneonone/pages/${id}/`, { method: 'DELETE' });
    }

    addSlots(pageId: number, slots: SlotInput[]) {
        return this.request<AddSlotsResult>(`/api/v1/oneonone/pages/${pageId}/add_slots/`, {
            method: 'POST',
            body: { slots },
        });
    }

    deleteSlot(pageId: number, slotId: number) {
        return this.request<null>(`/api/v1/oneonone/pages/${pageId}/slots/${slotId}/`, { method: 'DELETE' });
    }

    pageBookings(pageId: number) {
        return this.request<Booking[]>(`/api/v1/oneonone/pages/${pageId}/bookings/`);
    }

    hostBookings(page = 1) {
        return this.request<PaginatedResponse<Booking>>('/api/v1/oneonone/bookings/', { query: { page } });
    }

    confirmHostBooking(uuid: string) {
        return this.request<BookingActionResult>(`/api/v1/oneonone/bookings/${uuid}/confirm/`, {
            method: 'POST',
            body: {},
        });
    }

    cancelHostBooking(uuid: string) {
        return this.request<BookingActionResult>(`/api/v1/oneonone/bookings/${uuid}/cancel/`, {
            method: 'POST',
            body: {},
        });
    }

    // ------------------------------------------------------------ 1-on-1 (guest, login-free)

    getPublicBookingPage(slug: string) {
        return this.request<PublicBookingPage>(`/api/v1/oneonone/booking/${encodeURIComponent(slug)}/`, { auth: false });
    }

    reserve(slug: string, input: BookingInput) {
        return this.request<ReserveResult>(`/api/v1/oneonone/booking/${encodeURIComponent(slug)}/reserve/`, {
            method: 'POST',
            body: input,
            auth: false,
        });
    }

    getBooking(uuid: string) {
        return this.request<Booking>(`/api/v1/oneonone/booking/${uuid}/`, { auth: false });
    }

    cancelBooking(uuid: string, cancelToken: string) {
        return this.request<BookingActionResult>(`/api/v1/oneonone/booking/${uuid}/cancel/`, {
            method: 'POST',
            body: { cancel_token: cancelToken },
            auth: false,
        });
    }
}
