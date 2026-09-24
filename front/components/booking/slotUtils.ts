import { toDayKey } from '@/lib/date';
import type { SlotInput } from '@/types';

/** The API accepts at most 30 slots when a page is created */
export const MAX_CREATE_SLOTS = 30;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

/** "HH:mm" options every 15 minutes (00:00 - 23:45) */
export const TIME_OPTIONS: string[] = Array.from({ length: 96 }, (_, i) => {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function atTime(day: Date, time: string): Date {
    const [h, m] = time.split(':').map(Number);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h || 0, m || 0, 0, 0);
}

/**
 * Back-to-back slots of `durationMinutes` between `startTime` and `endTime` on each day
 * (browser time zone). Slots that start in the past are skipped.
 */
export function generateSlots(
    days: Date[],
    startTime: string,
    endTime: string,
    durationMinutes: number,
    now: Date = new Date()
): SlotInput[] {
    const duration = Math.max(5, durationMinutes || 30) * 60_000;
    const slots: SlotInput[] = [];
    for (const day of days) {
        const dayEnd = atTime(day, endTime).getTime();
        for (let start = atTime(day, startTime).getTime(); start + duration <= dayEnd; start += duration) {
            if (start <= now.getTime()) continue;
            slots.push({ start_at: new Date(start).toISOString(), end_at: new Date(start + duration).toISOString() });
        }
    }
    return slots;
}

/** Merge new slots into a list, dropping exact start-time duplicates, sorted by start */
export function mergeSlots(existing: SlotInput[], added: SlotInput[]): SlotInput[] {
    const seen = new Set(existing.map((s) => new Date(s.start_at).getTime()));
    const merged = [...existing];
    for (const slot of added) {
        const key = new Date(slot.start_at).getTime();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(slot);
    }
    return merged.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

/** Group items by local calendar day, keeping the order of days and items */
export function groupByDay<T>(items: T[], getStart: (item: T) => string): { dayKey: string; date: Date; items: T[] }[] {
    const groups = new Map<string, { dayKey: string; date: Date; items: T[] }>();
    const sorted = [...items].sort((a, b) => new Date(getStart(a)).getTime() - new Date(getStart(b)).getTime());
    for (const item of sorted) {
        const date = new Date(getStart(item));
        const dayKey = toDayKey(date);
        const group = groups.get(dayKey);
        if (group) group.items.push(item);
        else groups.set(dayKey, { dayKey, date, items: [item] });
    }
    return [...groups.values()];
}
