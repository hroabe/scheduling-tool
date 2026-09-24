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
    created_at: string;
    updated_at: string;
}

/** Returned only once, right after submitting a response */
export interface ParticipantWithToken extends Participant {
    edit_token: string;
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
    department: string;
    deadline: string | null;
    timezone_name: string;
    is_active: boolean;
    allow_maybe: boolean;
    is_finalized: boolean;
    finalized_candidate: number | null;
    can_respond: boolean;
    is_expired: boolean;
    has_edit_key: boolean;
    candidates: Candidate[];
    participants: Participant[];
    url: string;
    created_at: string;
    updated_at: string;
}

/** Response of POST /schedules/ (edit key is returned once when auto-generated) */
export interface CreatedSchedule extends Schedule {
    _edit_key?: string;
}

export interface ScheduleInput {
    name: string;
    description?: string;
    owner_name: string;
    edit_key?: string;
    deadline?: string | null;
    timezone_name?: string;
    allow_maybe?: boolean;
    candidates: CandidateInput[];
}

export interface ScheduleUpdateInput {
    name?: string;
    description?: string;
    owner_name?: string;
    deadline?: string | null;
    is_active?: boolean;
    allow_maybe?: boolean;
}

export interface CandidateSummary {
    candidate_id: number;
    start_at: string;
    end_at: string;
    note: string;
    ok_count: number;
    maybe_count: number;
    ng_count: number;
    score: number;
    is_recommended: boolean;
}

export interface ScheduleSummary {
    schedule_id: number;
    schedule_name: string;
    total_participants: number;
    candidates: CandidateSummary[];
    recommended_candidate: CandidateSummary | null;
}

export interface ApiErrorBody {
    detail?: string;
    [key: string]: unknown;
}
