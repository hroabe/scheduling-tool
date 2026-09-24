/** Availability symbols — same rules as the web app (front/lib/availabilitySymbols.ts) */

import type { AttendanceStatus } from '../api/types';

export interface AvailabilitySymbols {
    ok: string;
    maybe: string;
    ng: string;
}

export function getAvailabilitySymbols(locale: string, cute = false): AvailabilitySymbols {
    if (cute) return { ok: '😊', maybe: '🤔', ng: '😢' };
    if (locale === 'ja' || locale === 'ko') return { ok: '◯', maybe: '△', ng: '×' };
    return { ok: '✓', maybe: '?', ng: '✗' };
}

export function symbolFor(symbols: AvailabilitySymbols, status: AttendanceStatus | undefined): string {
    return status ? symbols[status] : '–';
}
