/**
 * Type definitions for the scheduling tool
 */

// Attendance status types
export type AttendanceStatus = 'ok' | 'maybe' | 'ng' | 'pending';

export interface Attendance {
    id: number;
    candidate: number;
    participant: number;
    status: AttendanceStatus;
    status_display: string;
    created_at: string;
    updated_at: string;
}

export interface Candidate {
    id: number;
    start_at: string;
    end_at: string;
    note: string;
    order: number;
    ok_count: number;
    maybe_count: number;
    ng_count: number;
    created_at: string;
}

export interface CandidateInput {
    start_at: string;
    end_at: string;
    note?: string;
    order?: number;
}

export interface Participant {
    id: number;
    name: string;
    comment: string;
    attendances: Attendance[];
    edit_url?: string;
    created_at: string;
    updated_at: string;
}

export interface ParticipantInput {
    name: string;
    comment?: string;
    attendances: {
        candidate: number;
        status: AttendanceStatus;
    }[];
}

export interface Schedule {
    id: number;
    uuid: string;
    name: string;
    description: string;
    owner_name: string;
    owner_email?: string;
    department: string;
    deadline?: string;
    timezone_name: string;
    is_active: boolean;
    allow_maybe: boolean;
    show_participant_count: boolean;
    is_finalized: boolean;
    finalized_candidate?: number;
    can_respond: boolean;
    is_expired: boolean;
    candidates: Candidate[];
    participants: Participant[];
    url: string;
    created_at: string;
    updated_at: string;
}

export interface ScheduleListItem {
    id: number;
    uuid: string;
    name: string;
    owner_name: string;
    department: string;
    deadline?: string;
    is_active: boolean;
    is_finalized: boolean;
    participant_count: number;
    candidate_count: number;
    url: string;
    created_at: string;
}

export interface ScheduleInput {
    name: string;
    description?: string;
    owner_name: string;
    owner_email?: string;
    department?: string;
    edit_key?: string;
    deadline?: string;
    timezone_name?: string;
    allow_maybe?: boolean;
    show_participant_count?: boolean;
    notify_on_response?: boolean;
    candidates: CandidateInput[];
}

export interface ScheduleSummary {
    schedule_id: number;
    schedule_name: string;
    total_participants: number;
    candidates: CandidateSummary[];
    recommended_candidate?: CandidateSummary;
}

export interface CandidateSummary {
    candidate_id: number;
    start_at: string;
    end_at: string;
    ok_count: number;
    maybe_count: number;
    ng_count: number;
    score: number;
}

// API response types
export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface ApiError {
    detail?: string;
    [key: string]: string | string[] | undefined;
}
