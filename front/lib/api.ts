/**
 * API Client for the scheduling tool
 */

import type {
    ApiErrorBody,
    Candidate,
    CandidateInput,
    CreatedSchedule,
    Participant,
    ParticipantInput,
    ParticipantWithToken,
    Schedule,
    ScheduleInput,
    ScheduleSummary,
    ScheduleUpdateInput,
} from '@/types';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

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

type RequestOptions = RequestInit & { editKey?: string };

export class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { editKey, headers, ...rest } = options;
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...rest,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(editKey ? { 'X-Edit-Key': editKey } : {}),
                ...headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new ApiError(response.status, error);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        return response.json();
    }

    // Schedule endpoints
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

    updateSchedule(uuid: string, data: ScheduleUpdateInput, editKey: string): Promise<Schedule> {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
            editKey,
        });
    }

    deleteSchedule(uuid: string, editKey: string): Promise<void> {
        return this.request<void>(`/api/v1/schedules/${uuid}/`, {
            method: 'DELETE',
            editKey,
        });
    }

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

    // Response/Participation endpoints
    submitResponse(uuid: string, data: ParticipantInput, editToken?: string): Promise<ParticipantWithToken> {
        const body = editToken ? { ...data, edit_token: editToken } : data;
        return this.request<ParticipantWithToken>(`/api/v1/schedules/${uuid}/respond/`, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    getParticipants(uuid: string): Promise<Participant[]> {
        return this.request<Participant[]>(`/api/v1/schedules/${uuid}/participants/`);
    }

    deleteParticipant(
        uuid: string,
        participantId: number,
        auth: { editToken?: string; editKey?: string }
    ): Promise<void> {
        return this.request<void>(`/api/v1/schedules/${uuid}/participants/${participantId}/`, {
            method: 'DELETE',
            body: auth.editToken ? JSON.stringify({ edit_token: auth.editToken }) : undefined,
            editKey: auth.editKey,
        });
    }

    // Candidates
    addCandidate(uuid: string, data: CandidateInput, editKey: string): Promise<Candidate> {
        return this.request<Candidate>(`/api/v1/schedules/${uuid}/candidates/`, {
            method: 'POST',
            body: JSON.stringify(data),
            editKey,
        });
    }

    deleteCandidate(uuid: string, candidateId: number, editKey: string): Promise<void> {
        return this.request<void>(`/api/v1/schedules/${uuid}/candidates/${candidateId}/`, {
            method: 'DELETE',
            editKey,
        });
    }

    // Finalization (candidateId=null cancels the finalization)
    finalizeSchedule(uuid: string, candidateId: number | null, editKey: string): Promise<Schedule> {
        return this.request<Schedule>(`/api/v1/schedules/${uuid}/finalize/`, {
            method: 'POST',
            body: JSON.stringify({ candidate_id: candidateId }),
            editKey,
        });
    }

    // Summary
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
}

export const api = new ApiClient();
export default api;
