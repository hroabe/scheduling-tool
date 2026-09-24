/**
 * API Client for the scheduling tool
 *
 * - Session cookies are sent with every request (credentials: 'include') and unsafe
 *   requests carry the Django CSRF token (fetched once from /accounts/csrf/).
 * - When Keycloak is enabled, the OIDC access token is sent as a Bearer token.
 * - Secrets are never put in URLs: edit keys, response edit tokens and 1-on-1 host
 *   tokens travel in X-Edit-Key / X-Edit-Token / X-Host-Token headers.
 */

import type {
    ApiErrorBody,
    AuthResponse,
    Booking,
    Candidate,
    CandidateInput,
    CreateBookingPageInput,
    CreatedBookingPage,
    CreatedSchedule,
    HostBookingPage,
    IntegrationStatus,
    PaginatedResponse,
    Participant,
    ParticipantInput,
    ParticipantWithToken,
    PublicBookingPage,
    RegisterInput,
    ReservationInput,
    ReservationResult,
    Schedule,
    ScheduleInput,
    ScheduleListItem,
    ScheduleSummary,
    ScheduleUpdateInput,
    SlotInput,
    User,
    UserIntegration,
} from '@/types';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

export type IntegrationProvider = 'google' | 'outlook';

/** Pick the first human-readable message out of a DRF error body */
export function extractErrorMessage(data: unknown): string | undefined {
    if (!data) return undefined;
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) {
        for (const item of data) {
            const message = extractErrorMessage(item);
            if (message) return message;
        }
        return undefined;
    }
    if (typeof data === 'object') {
        const record = data as Record<string, unknown>;
        if (typeof record.detail === 'string') return record.detail;
        if (typeof record.error === 'string') return record.error;
        for (const value of Object.values(record)) {
            const message = extractErrorMessage(value);
            if (message) return message;
        }
    }
    return undefined;
}

export class ApiError extends Error {
    status: number;
    data: ApiErrorBody;

    constructor(status: number, data: ApiErrorBody) {
        const fallback =
            status === 429
                ? 'アクセスが集中しています。しばらくしてから再度お試しください。'
                : status === 404
                  ? 'イベントが見つかりませんでした。'
                  : `エラーが発生しました（${status}）`;
        super(extractErrorMessage(data) || fallback);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

interface AuthHooks {
    getAccessToken: () => Promise<string | null> | string | null;
    onUnauthorized: () => void;
}

let authHooks: AuthHooks = { getAccessToken: () => null, onUnauthorized: () => undefined };

/** Wired up by the auth store (avoids a circular import) */
export function configureAuth(hooks: AuthHooks): void {
    authHooks = hooks;
}

type RequestOptions = RequestInit & {
    editKey?: string;
    editToken?: string;
    hostToken?: string;
    /** Do not attach session / bearer credentials (public endpoints) */
    anonymous?: boolean;
};

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

export class ApiClient {
    private baseUrl: string;
    private csrfPromise: Promise<void> | null = null;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private async ensureCsrfCookie(): Promise<string | null> {
        const existing = readCookie('csrftoken');
        if (existing || typeof document === 'undefined') return existing;
        this.csrfPromise ??= fetch(`${this.baseUrl}/api/v1/accounts/csrf/`, { credentials: 'include' })
            .then(() => undefined)
            .catch(() => undefined)
            .finally(() => {
                this.csrfPromise = null;
            });
        await this.csrfPromise;
        return readCookie('csrftoken');
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { editKey, editToken, hostToken, anonymous, headers, ...rest } = options;
        const method = (rest.method || 'GET').toUpperCase();

        const finalHeaders: Record<string, string> = {
            Accept: 'application/json',
            ...(rest.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(editKey ? { 'X-Edit-Key': editKey } : {}),
            ...(editToken ? { 'X-Edit-Token': editToken } : {}),
            ...(hostToken ? { 'X-Host-Token': hostToken } : {}),
            ...(headers as Record<string, string> | undefined),
        };

        if (!anonymous) {
            const accessToken = await authHooks.getAccessToken();
            if (accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`;
            if (UNSAFE_METHODS.has(method)) {
                const csrf = await this.ensureCsrfCookie();
                if (csrf) finalHeaders['X-CSRFToken'] = csrf;
            }
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...rest,
            method,
            headers: finalHeaders,
            credentials: anonymous ? 'omit' : 'include',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            if (response.status === 401 && !anonymous) authHooks.onUnauthorized();
            throw new ApiError(response.status, error);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        return response.json();
    }

    // ------------------------------------------------------------------ schedules
    getSchedule(uuid: string): Promise<Schedule> {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/`);
    }

    createSchedule(data: ScheduleInput, ref?: string | null): Promise<CreatedSchedule> {
        // ref (UTM) is sent as a query parameter so it shows up in access logs
        const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
        return this.request<CreatedSchedule>(`/api/v1/schedules/${query}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    updateSchedule(uuid: string, data: ScheduleUpdateInput, editKey?: string): Promise<Schedule> {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
            editKey,
        });
    }

    deleteSchedule(uuid: string, editKey?: string): Promise<void> {
        return this.request<void>(`/api/v1/schedules/${uuid}/`, { method: 'DELETE', editKey });
    }

    /** true when the key is correct or the signed-in user owns the event */
    async verifyEditKey(uuid: string, editKey: string): Promise<boolean> {
        try {
            await this.request(`/api/v1/schedules/${uuid}/verify_edit_key/`, {
                method: 'POST',
                body: '{}',
                editKey,
            });
            return true;
        } catch (error) {
            if (error instanceof ApiError && error.status === 403) return false;
            throw error;
        }
    }

    submitResponse(uuid: string, data: ParticipantInput, editToken?: string): Promise<ParticipantWithToken> {
        return this.request<ParticipantWithToken>(`/api/v1/schedules/${uuid}/respond/`, {
            method: 'POST',
            body: JSON.stringify(data),
            editToken,
        });
    }

    getParticipants(uuid: string): Promise<Participant[]> {
        return this.request<Participant[]>(`/api/v1/schedules/${uuid}/participants/`);
    }

    deleteParticipant(uuid: string, participantId: number, auth: { editToken?: string; editKey?: string }): Promise<void> {
        return this.request<void>(`/api/v1/schedules/${uuid}/participants/${participantId}/`, {
            method: 'DELETE',
            editToken: auth.editToken,
            editKey: auth.editKey,
        });
    }

    addCandidate(uuid: string, data: CandidateInput, editKey?: string): Promise<Candidate> {
        return this.request<Candidate>(`/api/v1/schedules/${uuid}/candidates/`, {
            method: 'POST',
            body: JSON.stringify(data),
            editKey,
        });
    }

    deleteCandidate(uuid: string, candidateId: number, editKey?: string): Promise<void> {
        return this.request<void>(`/api/v1/schedules/${uuid}/candidates/${candidateId}/`, {
            method: 'DELETE',
            editKey,
        });
    }

    /** candidateId=null cancels the finalization */
    finalizeSchedule(uuid: string, candidateId: number | null, editKey?: string): Promise<Schedule> {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/finalize/`, {
            method: 'POST',
            body: JSON.stringify({ candidate_id: candidateId }),
            editKey,
        });
    }

    closeSchedule(uuid: string, editKey?: string): Promise<Schedule> {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/close/`, { method: 'POST', body: '{}', editKey });
    }

    reopenSchedule(uuid: string, editKey?: string): Promise<Schedule> {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/reopen/`, { method: 'POST', body: '{}', editKey });
    }

    getScheduleSummary(uuid: string): Promise<ScheduleSummary> {
        return this.request<ScheduleSummary>(`/api/v1/schedules/${uuid}/summary/`);
    }

    // Exports are plain downloads (Content-Disposition: attachment), so we only build URLs.
    exportCsvUrl(uuid: string, includeComments = true): string {
        return `${this.baseUrl}/api/v1/schedules/${uuid}/export_csv/?include_comments=${includeComments}`;
    }

    exportIcsUrl(uuid: string, candidateId?: number): string {
        const query = candidateId ? `?candidate_id=${candidateId}` : '';
        return `${this.baseUrl}/api/v1/schedules/${uuid}/export_ics/${query}`;
    }

    // ------------------------------------------------------------------ accounts
    login(usernameOrEmail: string, password: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/api/v1/accounts/login/', {
            method: 'POST',
            body: JSON.stringify({ username: usernameOrEmail, password }),
        });
    }

    logout(): Promise<{ message: string }> {
        return this.request('/api/v1/accounts/logout/', { method: 'POST', body: '{}' });
    }

    register(data: RegisterInput): Promise<AuthResponse> {
        return this.request<AuthResponse>('/api/v1/accounts/register/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    checkEmail(email: string): Promise<{ exists: boolean }> {
        return this.request('/api/v1/accounts/check-email/', { method: 'POST', body: JSON.stringify({ email }) });
    }

    getMe(): Promise<User> {
        return this.request<User>('/api/v1/accounts/me/');
    }

    updateMe(data: Record<string, unknown>): Promise<User> {
        return this.request<User>('/api/v1/accounts/me/', { method: 'PATCH', body: JSON.stringify(data) });
    }

    changePassword(data: { old_password: string; new_password: string; new_password_confirm: string }) {
        return this.request<{ message: string }>('/api/v1/accounts/password/change/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    getMySchedules(page = 1): Promise<PaginatedResponse<ScheduleListItem>> {
        return this.request(`/api/v1/accounts/me/schedules/?page=${page}`);
    }

    getIntegrations(): Promise<PaginatedResponse<UserIntegration>> {
        return this.request('/api/v1/accounts/integrations/');
    }

    // ------------------------------------------------------------------ calendar integrations
    getIntegrationStatus(provider: IntegrationProvider): Promise<IntegrationStatus> {
        return this.request(`/api/v1/integrations/${provider}/status/`);
    }

    /** Returns the provider's OAuth URL; the browser is then redirected there */
    connectIntegration(provider: IntegrationProvider): Promise<{ auth_url: string }> {
        return this.request(`/api/v1/integrations/${provider}/connect/`, { method: 'POST', body: '{}' });
    }

    disconnectIntegration(provider: IntegrationProvider): Promise<{ message: string }> {
        return this.request(`/api/v1/integrations/${provider}/disconnect/`, { method: 'POST', body: '{}' });
    }

    // ------------------------------------------------------------------ 1-on-1 booking (login-free)
    createBookingPage(data: CreateBookingPageInput): Promise<CreatedBookingPage> {
        return this.request('/api/v1/oneonone/booking/', { method: 'POST', body: JSON.stringify(data) });
    }

    verifyBookingPage(slug: string, token: string): Promise<{ slug: string; status: string; message: string }> {
        return this.request('/api/v1/oneonone/booking/verify/', {
            method: 'POST',
            body: JSON.stringify({ slug, token }),
        });
    }

    getHostBookingPage(slug: string, hostToken: string): Promise<HostBookingPage> {
        return this.request(`/api/v1/oneonone/booking/${slug}/host/`, { hostToken });
    }

    updateHostBookingPage(
        slug: string,
        hostToken: string,
        data: Partial<Pick<HostBookingPage, 'title' | 'description' | 'is_active' | 'notify_on_booking'>>
    ): Promise<HostBookingPage> {
        return this.request(`/api/v1/oneonone/booking/${slug}/host/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
            hostToken,
        });
    }

    addHostSlots(slug: string, hostToken: string, slots: SlotInput[]) {
        return this.request<{ created: unknown[]; errors: unknown[] }>(`/api/v1/oneonone/booking/${slug}/host/slots/`, {
            method: 'POST',
            body: JSON.stringify({ slots }),
            hostToken,
        });
    }

    deleteHostSlot(slug: string, hostToken: string, slotId: number): Promise<{ message: string }> {
        return this.request(`/api/v1/oneonone/booking/${slug}/host/slots/${slotId}/`, { method: 'DELETE', hostToken });
    }

    resendBookingVerification(slug: string, hostToken: string): Promise<{ message: string }> {
        return this.request(`/api/v1/oneonone/booking/${slug}/host/resend-verification/`, {
            method: 'POST',
            body: '{}',
            hostToken,
        });
    }

    hostCancelBooking(slug: string, hostToken: string, bookingUuid: string): Promise<{ message: string; booking: Booking }> {
        return this.request(`/api/v1/oneonone/booking/${slug}/host/bookings/${bookingUuid}/cancel/`, {
            method: 'POST',
            body: '{}',
            hostToken,
        });
    }

    getPublicBookingPage(slug: string): Promise<PublicBookingPage> {
        return this.request(`/api/v1/oneonone/booking/${slug}/`);
    }

    reserveSlot(slug: string, data: ReservationInput): Promise<ReservationResult> {
        return this.request(`/api/v1/oneonone/booking/${slug}/reserve/`, { method: 'POST', body: JSON.stringify(data) });
    }

    /** Without the guest's cancel token, guest_email / guest_message are omitted by the API */
    getBooking(uuid: string, cancelToken?: string): Promise<Booking> {
        return this.request(`/api/v1/oneonone/booking/${uuid}/`, {
            headers: cancelToken ? { 'X-Cancel-Token': cancelToken } : undefined,
        });
    }

    cancelBooking(uuid: string, cancelToken: string): Promise<{ message: string; booking: Booking }> {
        return this.request(`/api/v1/oneonone/booking/${uuid}/cancel/`, {
            method: 'POST',
            body: JSON.stringify({ cancel_token: cancelToken }),
        });
    }
}

export const api = new ApiClient();
export default api;
