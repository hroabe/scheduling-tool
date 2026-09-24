/**
 * Type definitions for the scheduling tool
 */

// ---------------------------------------------------------------------------
// Group scheduling (Schedule / Candidate / Participant)
// ---------------------------------------------------------------------------

export type AttendanceStatus = 'ok' | 'maybe' | 'ng' | 'pending';

export type ScheduleStatus = 'open' | 'closed' | 'fixed';

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

/** Returned only once, right after submitting a new response */
export interface ParticipantWithToken extends Participant {
    edit_token?: string;
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
    finalized_at: string | null;
    closed_at: string | null;
    status: ScheduleStatus;
    is_closed: boolean;
    can_respond: boolean;
    is_expired: boolean;
    has_edit_key: boolean;
    /** true when the signed-in user created this event */
    is_owner: boolean;
    meeting_provider: 'google_meet' | 'teams' | 'zoom' | null;
    meeting_url: string | null;
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

export interface ScheduleListItem {
    id: number;
    uuid: string;
    name: string;
    owner_name: string;
    department: string;
    deadline: string | null;
    is_active: boolean;
    is_finalized: boolean;
    status: ScheduleStatus;
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
    notify_on_response?: boolean;
    department?: string;
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
    owner_email?: string | null;
    notify_on_response?: boolean;
    department?: string;
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

// ---------------------------------------------------------------------------
// Accounts (RFC-0003 / RFC-0011)
// ---------------------------------------------------------------------------

export interface UserProfile {
    timezone_name: string;
    email_notifications: boolean;
    avatar_url?: string | null;
    preferred_language?: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    profile?: UserProfile | null;
    date_joined: string;
}

export interface UserIntegration {
    id: number;
    provider: 'google' | 'outlook' | 'zoom';
    provider_display: string;
    is_active: boolean;
    is_valid: boolean;
    is_expired: boolean;
    expires_at: string | null;
    scopes: string;
    last_used_at?: string | null;
    created_at: string;
}

export interface IntegrationStatus {
    configured: boolean;
    connected: boolean;
    is_valid?: boolean;
    is_expired?: boolean;
    expires_at?: string | null;
    last_used_at?: string | null;
    error_count?: number;
}

export interface RegisterInput {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
}

export interface AuthResponse {
    user: User;
    message: string;
}

// ---------------------------------------------------------------------------
// 1-on-1 booking (RFC-0005)
// ---------------------------------------------------------------------------

export type AvailabilityPageStatus = 'DRAFT' | 'PENDING_VERIFY' | 'PUBLISHED' | 'UNPUBLISHED';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface AvailabilitySlot {
    id: number;
    start_at: string;
    end_at: string;
    is_booked: boolean;
    is_available: boolean;
    created_at: string;
    updated_at: string;
}

export interface SlotInput {
    start_at: string;
    end_at: string;
}

export interface Booking {
    uuid: string;
    slot: number;
    slot_info: AvailabilitySlot;
    page_title: string;
    host_name: string;
    guest_name: string;
    guest_email: string;
    guest_message: string;
    status: BookingStatus;
    status_display: string;
    meeting_url: string | null;
    confirmed_at: string | null;
    cancelled_at: string | null;
    created_at: string;
}

/** Guest-facing public page */
export interface PublicBookingPage {
    slug: string;
    title: string;
    description: string;
    organizer: string;
    timezone_name: string;
    duration_minutes: number;
    available_slots: AvailabilitySlot[];
    status: AvailabilityPageStatus;
}

/** Host management view (requires the host token) */
export interface HostBookingPage {
    id: number;
    slug: string;
    title: string;
    description: string;
    organizer_name: string;
    organizer_email: string;
    timezone_name: string;
    duration_minutes: number;
    buffer_minutes: number;
    status: AvailabilityPageStatus;
    is_active: boolean;
    notify_on_booking: boolean;
    slots: AvailabilitySlot[];
    bookings: Booking[];
    public_url: string;
    created_at: string;
    updated_at: string;
}

export interface CreateBookingPageInput {
    title: string;
    organizer_name: string;
    organizer_email: string;
    duration_minutes: number;
    timezone_name?: string;
    slots: SlotInput[];
}

export interface CreatedBookingPage {
    slug: string;
    status: AvailabilityPageStatus;
    message: string;
    host_token: string;
    host_url: string;
    /** Only returned when the API runs with DEBUG=True */
    verify_url?: string;
}

export interface ReservationInput {
    slot: number;
    guest_name: string;
    guest_email: string;
    guest_message?: string;
}

export interface ReservationResult {
    booking: Booking;
    cancel_token: string;
    message: string;
}

// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface ApiErrorBody {
    detail?: string;
    error?: string;
    [key: string]: unknown;
}
