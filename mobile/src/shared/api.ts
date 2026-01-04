import { Constants } from '../constants';
import type {
    Schedule,
    ScheduleListItem,
    ScheduleInput,
    ScheduleSummary,
    Participant,
    ParticipantInput,
    PaginatedResponse,
    User,
    AuthResponse,
    RegisterInput,
    UserIntegration,
    AvailabilityPage,
    AvailabilitySlot,
    Booking,
    BookingInput,
} from './types';

const API_BASE_URL = Constants.API_URL;

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const config: RequestInit = {
            ...options,
            credentials: 'include', // For session cookies
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new ApiError(response.status, error);
            }

            if (response.status === 204) {
                return {} as T;
            }

            return response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // ==================== Schedule API ====================

    async getSchedules(params?: {
        page?: number;
        page_size?: number;
        search?: string;
    }): Promise<PaginatedResponse<ScheduleListItem>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
        if (params?.search) searchParams.set('search', params.search);

        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return this.request<PaginatedResponse<ScheduleListItem>>(`/api/v1/schedules/${query}`);
    }

    async getSchedule(uuid: string): Promise<Schedule> {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/`);
    }

    async createSchedule(data: ScheduleInput): Promise<Schedule> {
        return this.request<Schedule>('/api/v1/schedules/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateSchedule(
        uuid: string,
        data: Partial<ScheduleInput>,
        editKey?: string
    ): Promise<Schedule> {
        const params = editKey ? `?edit_key=${encodeURIComponent(editKey)}` : '';
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/${params}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deleteSchedule(uuid: string, editKey?: string): Promise<void> {
        const params = editKey ? `?edit_key=${encodeURIComponent(editKey)}` : '';
        return this.request<void>(`/api/v1/schedules/${uuid}/${params}`, {
            method: 'DELETE',
        });
    }

    async submitResponse(
        uuid: string,
        data: ParticipantInput,
        editToken?: string
    ): Promise<Participant> {
        const body = editToken ? { ...data, edit_token: editToken } : data;
        return this.request<Participant>(`/api/v1/schedules/${uuid}/respond/`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async getParticipants(uuid: string): Promise<Participant[]> {
        const response = await this.request<PaginatedResponse<Participant>>(
            `/api/v1/schedules/${uuid}/participants/`
        );
        return response.results;
    }

    async deleteParticipant(
        uuid: string,
        participantId: number,
        token?: string
    ): Promise<void> {
        const params = token ? `?token=${encodeURIComponent(token)}` : '';
        return this.request<void>(
            `/api/v1/schedules/${uuid}/participants/${participantId}/${params}`,
            { method: 'DELETE' }
        );
    }

    async finalizeSchedule(
        uuid: string,
        candidateId: number,
        editKey?: string
    ): Promise<Schedule> {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/finalize/`, {
            method: 'POST',
            body: JSON.stringify({
                candidate_id: candidateId,
                edit_key: editKey,
            }),
        });
    }

    async getScheduleSummary(uuid: string): Promise<ScheduleSummary> {
        return this.request<ScheduleSummary>(`/api/v1/schedules/${uuid}/summary/`);
    }

    // ==================== RFC-0003: Auth API ====================

    async login(username: string, password: string): Promise<AuthResponse> {
        return this.request<AuthResponse>('/api/v1/accounts/login/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    }

    async logout(): Promise<{ message: string }> {
        return this.request<{ message: string }>('/api/v1/accounts/logout/', {
            method: 'POST',
        });
    }

    async register(data: RegisterInput): Promise<AuthResponse> {
        return this.request<AuthResponse>('/api/v1/accounts/register/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMe(): Promise<User> {
        return this.request<User>('/api/v1/accounts/me/');
    }

    async updateMe(data: Partial<User>): Promise<User> {
        return this.request<User>('/api/v1/accounts/me/', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async getMySchedules(): Promise<ScheduleListItem[]> {
        const response = await this.request<PaginatedResponse<ScheduleListItem>>(
            '/api/v1/accounts/me/schedules/'
        );
        return response.results;
    }

    async getIntegrations(): Promise<UserIntegration[]> {
        const response = await this.request<PaginatedResponse<UserIntegration>>(
            '/api/v1/accounts/integrations/'
        );
        return response.results;
    }

    // ==================== RFC-0001/0002: Integration API ====================

    async getGoogleConnectUrl(): Promise<{ auth_url: string }> {
        return this.request<{ auth_url: string }>('/api/v1/integrations/google/connect/', {
            method: 'POST',
        });
    }

    async getOutlookConnectUrl(): Promise<{ auth_url: string }> {
        return this.request<{ auth_url: string }>('/api/v1/integrations/outlook/connect/', {
            method: 'POST',
        });
    }

    async disconnectGoogle(): Promise<{ message: string }> {
        return this.request<{ message: string }>('/api/v1/integrations/google/disconnect/', {
            method: 'POST',
        });
    }

    async disconnectOutlook(): Promise<{ message: string }> {
        return this.request<{ message: string }>('/api/v1/integrations/outlook/disconnect/', {
            method: 'POST',
        });
    }

    async getGoogleStatus(): Promise<{ connected: boolean; integration?: UserIntegration }> {
        return this.request('/api/v1/integrations/google/status/');
    }

    async getOutlookStatus(): Promise<{ connected: boolean; integration?: UserIntegration }> {
        return this.request('/api/v1/integrations/outlook/status/');
    }

    // ==================== RFC-0005: 1-on-1 Booking API ====================

    async getAvailabilityPages(): Promise<AvailabilityPage[]> {
        const response = await this.request<PaginatedResponse<AvailabilityPage>>(
            '/api/v1/oneonone/pages/'
        );
        return response.results;
    }

    async getAvailabilityPage(id: number): Promise<AvailabilityPage & { slots: AvailabilitySlot[] }> {
        return this.request(`/api/v1/oneonone/pages/${id}/`);
    }

    async getPublicAvailabilityPage(slug: string): Promise<AvailabilityPage & { available_slots: AvailabilitySlot[] }> {
        return this.request(`/api/v1/oneonone/p/${slug}/`);
    }

    async createBooking(slug: string, data: BookingInput): Promise<{ booking: Booking; cancel_token: string }> {
        return this.request(`/api/v1/oneonone/p/${slug}/book/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getBooking(uuid: string): Promise<Booking> {
        return this.request(`/api/v1/oneonone/booking/${uuid}/`);
    }

    async cancelBooking(uuid: string, cancelToken: string): Promise<{ message: string; booking: Booking }> {
        return this.request(`/api/v1/oneonone/booking/${uuid}/cancel/`, {
            method: 'POST',
            body: JSON.stringify({ cancel_token: cancelToken }),
        });
    }

    async getMyBookings(): Promise<Booking[]> {
        const response = await this.request<PaginatedResponse<Booking>>(
            '/api/v1/oneonone/bookings/'
        );
        return response.results;
    }

    async confirmBooking(id: number): Promise<{ message: string; booking: Booking }> {
        return this.request(`/api/v1/oneonone/bookings/${id}/confirm/`, {
            method: 'POST',
        });
    }
}

export class ApiError extends Error {
    status: number;
    data: Record<string, unknown>;

    constructor(status: number, data: Record<string, unknown>) {
        super(data.detail as string || `API Error: ${status}`);
        this.status = status;
        this.data = data;
    }
}

export const api = new ApiClient();
export default api;

