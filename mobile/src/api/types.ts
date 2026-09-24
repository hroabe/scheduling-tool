/**
 * API types (Django REST API v1). See docs/11_integration.md §2 for the current contract.
 */

export type AttendanceStatus = 'ok' | 'maybe' | 'ng';
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

/** Returned by POST /respond/ — `edit_token` ("<participant_id>.<secret>") only for a new response */
export interface RespondResult extends Participant {
    edit_token?: string;
}

export interface ParticipantInput {
    name: string;
    comment?: string;
    attendances: { candidate: number; status: AttendanceStatus }[];
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
    is_owner: boolean;
    meeting_provider?: string | null;
    meeting_url?: string | null;
    candidates: Candidate[];
    participants: Participant[];
    url: string;
    created_at: string;
    updated_at: string;
}

/** Create response: detail + `_edit_key` only when the server generated the key */
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

export type ScheduleUpdateInput = Partial<
    Pick<ScheduleInput, 'name' | 'description' | 'owner_name' | 'deadline' | 'allow_maybe'>
> & { is_active?: boolean };

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

// ---------------------------------------------------------------- accounts

export interface UserProfile {
    timezone_name: string;
    email_notifications: boolean;
    avatar_url?: string | null;
    preferred_language: string;
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

export interface AuthResponse {
    user: User;
    message: string;
    token?: string;
}

export interface RegisterInput {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
}

export type ProfileUpdateInput = Partial<Pick<User, 'first_name' | 'last_name' | 'email'>>;

// ---------------------------------------------------------------- 1-on-1

export interface AvailabilitySlot {
    id: number;
    start_at: string;
    end_at: string;
    is_booked: boolean;
    is_available: boolean;
    created_at: string;
    updated_at: string;
}

export interface AvailabilityPageListItem {
    id: number;
    slug: string;
    title: string;
    owner_name: string;
    duration_minutes: number;
    is_public: boolean;
    is_active: boolean;
    available_slots_count: number;
    created_at: string;
    updated_at: string;
}

export interface AvailabilityPageDetail {
    id: number;
    slug: string;
    title: string;
    description: string;
    owner_name: string;
    timezone_name: string;
    duration_minutes: number;
    buffer_minutes: number;
    is_public: boolean;
    is_active: boolean;
    notify_on_booking: boolean;
    slots: AvailabilitySlot[];
    available_slots: AvailabilitySlot[];
    public_url: string;
    created_at: string;
    updated_at: string;
}

export interface AvailabilityPageInput {
    slug: string;
    title: string;
    description?: string;
    timezone_name?: string;
    duration_minutes?: number;
    buffer_minutes?: number;
    is_public?: boolean;
    notify_on_booking?: boolean;
}

export interface SlotInput {
    start_at: string;
    end_at: string;
}

export interface AddSlotsResult {
    created: AvailabilitySlot[];
    errors: { index: number; errors: Record<string, string[]> }[];
}

/** GET /oneonone/booking/{slug}/ (public page, V2) */
export interface PublicBookingPage {
    slug: string;
    title: string;
    description: string;
    organizer: string;
    timezone_name: string;
    duration_minutes: number;
    available_slots: AvailabilitySlot[];
    status: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
    uuid: string;
    slot: number;
    slot_info?: AvailabilitySlot | null;
    page_title: string;
    host_name: string;
    guest_name: string;
    guest_email: string;
    guest_message: string;
    status: BookingStatus;
    status_display: string;
    meeting_url?: string | null;
    confirmed_at?: string | null;
    cancelled_at?: string | null;
    created_at: string;
}

export interface BookingInput {
    slot: number;
    guest_name: string;
    guest_email: string;
    guest_message?: string;
}

export interface ReserveResult {
    booking: Booking;
    cancel_token: string;
    message: string;
}

export interface BookingActionResult {
    message: string;
    booking: Booking;
}
