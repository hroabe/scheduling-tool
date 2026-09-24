import type { Schedule, ScheduleSummary } from '@/types';

export const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const iso = (day: number, hour: number) => new Date(2030, 3, day, hour, 0).toISOString();

export function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
    return {
        id: 1,
        uuid: UUID,
        name: 'チームミーティング',
        description: '週次定例会議',
        owner_name: '山田太郎',
        department: '',
        deadline: null,
        timezone_name: 'Asia/Tokyo',
        is_active: true,
        allow_maybe: true,
        is_finalized: false,
        finalized_candidate: null,
        finalized_at: null,
        closed_at: null,
        status: 'open',
        is_closed: false,
        is_owner: false,
        meeting_provider: null,
        meeting_url: null,
        can_respond: true,
        is_expired: false,
        has_edit_key: true,
        candidates: [
            { id: 11, start_at: iso(1, 10), end_at: iso(1, 11), note: '', order: 0, ok_count: 2, maybe_count: 0, ng_count: 0, created_at: iso(1, 0) },
            { id: 12, start_at: iso(2, 14), end_at: iso(2, 15), note: '会議室B', order: 1, ok_count: 0, maybe_count: 1, ng_count: 1, created_at: iso(1, 0) },
        ],
        participants: [
            {
                id: 101,
                name: '佐藤',
                comment: '午後なら参加できます',
                attendances: [
                    { id: 1, candidate: 11, participant: 101, status: 'ok', status_display: '◯', created_at: '', updated_at: '' },
                    { id: 2, candidate: 12, participant: 101, status: 'maybe', status_display: '△', created_at: '', updated_at: '' },
                ],
                created_at: iso(1, 0),
                updated_at: iso(1, 0),
            },
            {
                id: 102,
                name: '鈴木',
                comment: '',
                attendances: [
                    { id: 3, candidate: 11, participant: 102, status: 'ok', status_display: '◯', created_at: '', updated_at: '' },
                    { id: 4, candidate: 12, participant: 102, status: 'ng', status_display: '×', created_at: '', updated_at: '' },
                ],
                created_at: iso(1, 0),
                updated_at: iso(1, 0),
            },
        ],
        url: `/event/${UUID}`,
        created_at: iso(1, 0),
        updated_at: iso(1, 0),
        ...overrides,
    };
}

export function makeSummary(schedule: Schedule = makeSchedule()): ScheduleSummary {
    const candidates = schedule.candidates.map((c) => ({
        candidate_id: c.id,
        start_at: c.start_at,
        end_at: c.end_at,
        note: c.note,
        ok_count: c.ok_count,
        maybe_count: c.maybe_count,
        ng_count: c.ng_count,
        score: c.ok_count * 2 + c.maybe_count,
        is_recommended: false,
    }));
    candidates[0].is_recommended = true;
    return {
        schedule_id: schedule.id,
        schedule_name: schedule.name,
        total_participants: schedule.participants.length,
        candidates,
        recommended_candidate: candidates[0],
    };
}
