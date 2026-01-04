/**
 * API Client for the scheduling tool
 */

import type {
    Schedule,
    ScheduleListItem,
    ScheduleInput,
    ScheduleSummary,
    Participant,
    ParticipantInput,
    PaginatedResponse,
    User,
    UserProfile,
    UserIntegration,
    RegisterInput,
    AuthResponse,
} from '@/types';

// Validate required environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
    throw new Error(
        'NEXT_PUBLIC_API_URL environment variable is required. ' +
        'Set it in .env.local (development) or as an environment variable (production).'
    );
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL!) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const config: RequestInit = {
            ...options,
            credentials: 'include', // Required for session-based auth
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        const response = await fetch(url, config);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new ApiError(response.status, error);
        }

        // Handle empty responses
        if (response.status === 204) {
            return {} as T;
        }

        return response.json();
    }

    // Schedule endpoints
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

    // Response/Participation endpoints
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

    // Finalization
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

    // Summary
    async getScheduleSummary(uuid: string): Promise<ScheduleSummary> {
        return this.request<ScheduleSummary>(`/api/v1/schedules/${uuid}/summary/`);
    }

    // CSV Export
    async exportCsv(uuid: string, includeComments = true): Promise<Blob> {
        const url = `${this.baseUrl}/api/v1/schedules/${uuid}/export_csv/?include_comments=${includeComments}`;
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('Export failed');
        return response.blob();
    }

    // RFC-0003: Authentication endpoints
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

    async updateMe(data: Partial<User & UserProfile>): Promise<User> {
        return this.request<User>('/api/v1/accounts/me/', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async getMySchedules(params?: {
        page?: number;
        page_size?: number;
    }): Promise<PaginatedResponse<ScheduleListItem>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return this.request<PaginatedResponse<ScheduleListItem>>(`/api/v1/accounts/me/schedules/${query}`);
    }

    async getIntegrations(): Promise<PaginatedResponse<UserIntegration>> {
        return this.request<PaginatedResponse<UserIntegration>>('/api/v1/accounts/integrations/');
    }

    async disconnectIntegration(id: number): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/api/v1/accounts/integrations/${id}/disconnect/`, {
            method: 'POST',
        });
    }

    // RFC-0005: 1-on-1 Scheduling
    async getAvailabilityPages(): Promise<PaginatedResponse<any>> {
        return this.request<PaginatedResponse<any>>('/api/v1/oneonone/pages/');
    }

    async createAvailabilityPage(data: any): Promise<any> {
        return this.request<any>('/api/v1/oneonone/pages/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getAvailabilityPage(idOrSlug: string): Promise<any> {
        return this.request<any>(`/api/v1/oneonone/pages/${idOrSlug}/`);
    }

    async getPublicAvailabilityPage(slug: string): Promise<any> {
        return this.request<any>(`/api/v1/oneonone/p/${slug}/`);
    }

    async addAvailabilitySlots(
        pageId: number | string,
        data: { slots: { start_at: string; end_at: string }[] }
    ): Promise<any> {
        return this.request<any>(`/api/v1/oneonone/pages/${pageId}/add_slots/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async bookSlot(
        slug: string,
        data: { slot: number; guest_name: string; guest_email: string; guest_message?: string }
    ): Promise<any> {
        return this.request<any>(`/api/v1/oneonone/p/${slug}/book/`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // RFC-0001/0002: Calendar Integration
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

