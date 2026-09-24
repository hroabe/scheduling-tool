/**
 * Pure helpers for the create page's candidate builder (RFC-0013).
 *
 * Candidates are kept as local calendar days ("yyyy-MM-dd") plus "HH:mm" times while
 * editing, and converted to ISO datetimes (with the browser's UTC offset applied)
 * only when the event is submitted.
 */

import { combineDateAndTime, minutesBetween } from '@/lib/date';
import type { CandidateInput } from '@/types';

export const DEFAULT_START_TIME = '10:00';
export const DEFAULT_DURATION = 60;
export const DURATION_PRESETS = [30, 60, 90, 120] as const;
export const MAX_CUSTOM_DURATION = 720;
export const MAX_CANDIDATES = 100;
export const LAST_MINUTE_OF_DAY = 23 * 60 + 59;

export type DurationPreset = number | 'custom';
export type MinuteStep = 5 | 1;

export interface CandidateDraft {
    id: string;
    /** Local calendar day, "yyyy-MM-dd" */
    date: string;
    /** "HH:mm" */
    startTime: string;
    /** "HH:mm" (same day, after startTime) */
    endTime: string;
}

let draftSeq = 0;
export function newDraftId(): string {
    draftSeq += 1;
    return `draft-${Date.now()}-${draftSeq}`;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

export function fromMinutes(total: number): string {
    const clamped = Math.min(Math.max(Math.round(total), 0), LAST_MINUTE_OF_DAY);
    return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

export function timeFromParts(hour: number, minute: number): string {
    return fromMinutes(hour * 60 + minute);
}

export function timeParts(time: string): { hour: number; minute: number } {
    const total = toMinutes(time);
    return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** Shift a "HH:mm" string by minutes, clamped to the same day (00:00 - 23:59) */
export function shiftTime(time: string, minutes: number): string {
    return fromMinutes(toMinutes(time) + minutes);
}

/** End time for a start + duration; clamped to 23:59 (never wraps to the next day) */
export function computeEndTime(startTime: string, durationMinutes: number): string {
    return shiftTime(startTime, durationMinutes);
}

export function isTimeRangeValid(startTime: string, endTime: string): boolean {
    return TIME_RE.test(startTime) && TIME_RE.test(endTime) && minutesBetween(startTime, endTime) > 0;
}

export function isDraftValid(draft: CandidateDraft): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(draft.date) && isTimeRangeValid(draft.startTime, draft.endTime);
}

export function draftDuration(draft: Pick<CandidateDraft, 'startTime' | 'endTime'>): number {
    return minutesBetween(draft.startTime, draft.endTime);
}

/** "yyyy-MM-dd" -> local Date at midnight */
export function parseDayKey(dayKey: string): Date {
    const [y, m, d] = dayKey.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function sameSlot(a: Omit<CandidateDraft, 'id'>, b: Omit<CandidateDraft, 'id'>): boolean {
    return a.date === b.date && a.startTime === b.startTime && a.endTime === b.endTime;
}

export function sortDrafts(drafts: CandidateDraft[]): CandidateDraft[] {
    return [...drafts].sort(
        (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime)
    );
}

export interface AddDraftsResult {
    drafts: CandidateDraft[];
    added: number;
    duplicates: number;
    overLimit: number;
}

/** Add one slot per selected day, skipping exact duplicates and respecting MAX_CANDIDATES */
export function addDrafts(
    existing: CandidateDraft[],
    days: string[],
    startTime: string,
    endTime: string,
    max = MAX_CANDIDATES
): AddDraftsResult {
    const next = [...existing];
    let added = 0;
    let duplicates = 0;
    let overLimit = 0;
    for (const date of days) {
        const slot = { date, startTime, endTime };
        if (next.some((d) => sameSlot(d, slot))) {
            duplicates += 1;
        } else if (next.length >= max) {
            overLimit += 1;
        } else {
            next.push({ id: newDraftId(), ...slot });
            added += 1;
        }
    }
    return { drafts: sortDrafts(next), added, duplicates, overLimit };
}

/** Convert drafts to the API payload (sorted, ISO datetimes with the browser's offset) */
export function draftsToCandidateInputs(drafts: CandidateDraft[]): CandidateInput[] {
    return sortDrafts(drafts).map((draft, index) => {
        const day = parseDayKey(draft.date);
        return {
            start_at: combineDateAndTime(day, draft.startTime),
            end_at: combineDateAndTime(day, draft.endTime),
            note: '',
            order: index,
        };
    });
}

/** Minute options for a select, always including the current value */
export function minuteOptions(step: MinuteStep, current?: number): number[] {
    const options = Array.from({ length: 60 / step }, (_, i) => i * step);
    if (current !== undefined && !options.includes(current)) {
        options.push(current);
        options.sort((a, b) => a - b);
    }
    return options;
}

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

export function pad2(value: number): string {
    return String(value).padStart(2, '0');
}

/** State of the "add candidates" builder (calendar + time + duration) */
export interface BuilderState {
    selectedDates: string[];
    startTime: string;
    durationPreset: DurationPreset;
    customDuration: number;
    useDirectEndTime: boolean;
    directEndTime: string;
    minuteStep: MinuteStep;
}

export const INITIAL_BUILDER: BuilderState = {
    selectedDates: [],
    startTime: DEFAULT_START_TIME,
    durationPreset: DEFAULT_DURATION,
    customDuration: DEFAULT_DURATION,
    useDirectEndTime: false,
    directEndTime: computeEndTime(DEFAULT_START_TIME, DEFAULT_DURATION),
    minuteStep: 5,
};

export function builderDuration(state: BuilderState): number {
    return state.durationPreset === 'custom' ? state.customDuration : state.durationPreset;
}

/** End time the builder will use: the direct input, or start + duration (clamped to 23:59) */
export function builderEndTime(state: BuilderState): string {
    return state.useDirectEndTime ? state.directEndTime : computeEndTime(state.startTime, builderDuration(state));
}

/** Builder settings that reproduce an existing candidate's time slot ("duplicate") */
export function builderFromDraft(state: BuilderState, draft: CandidateDraft): BuilderState {
    const duration = draftDuration(draft);
    const isPreset = (DURATION_PRESETS as readonly number[]).includes(duration);
    return {
        ...state,
        startTime: draft.startTime,
        durationPreset: isPreset ? duration : 'custom',
        customDuration: isPreset ? state.customDuration : duration,
        useDirectEndTime: false,
        directEndTime: draft.endTime,
    };
}
