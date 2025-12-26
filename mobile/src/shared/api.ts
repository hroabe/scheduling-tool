import { Constants } from '../constants';
import type {
    Schedule,
    ScheduleListItem,
    ScheduleInput,
    ScheduleSummary,
    Participant,
    ParticipantInput,
    PaginatedResponse,
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
