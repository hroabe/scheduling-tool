/** Date helpers (Intl-based, locale aware; Hermes supports Intl on RN 0.76) */

import { getCalendars } from 'expo-localization';

import { intlTag, type Locale } from '../i18n/core';

export function parseDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function fmt(date: Date, locale: Locale, options: Intl.DateTimeFormatOptions): string {
    try {
        return new Intl.DateTimeFormat(intlTag(locale), options).format(date);
    } catch {
        return date.toISOString().slice(0, 16).replace('T', ' ');
    }
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(value: string | Date | null | undefined, locale: Locale): string {
    const date = parseDate(value);
    return date ? fmt(date, locale, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }) : '';
}

export function formatTime(value: string | Date | null | undefined, locale: Locale): string {
    const date = parseDate(value);
    return date ? fmt(date, locale, { hour: '2-digit', minute: '2-digit' }) : '';
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale): string {
    const date = parseDate(value);
    return date
        ? fmt(date, locale, { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })
        : '';
}

/** "Mon, Oct 3 10:00–11:00" (end date is shown only when it differs) */
export function formatRange(start: string | Date, end: string | Date, locale: Locale): string {
    const s = parseDate(start);
    const e = parseDate(end);
    if (!s) return '';
    if (!e) return formatDateTime(s, locale);
    if (isSameDay(s, e)) return `${formatDateTime(s, locale)}–${formatTime(e, locale)}`;
    return `${formatDateTime(s, locale)} – ${formatDateTime(e, locale)}`;
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000);
}

export function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

/** Date part of `day` combined with the time part of `time` (local time) */
export function combineDateTime(day: Date, time: Date): Date {
    const result = new Date(day);
    result.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return result;
}

/** Next full hour from now, local time */
export function nextFullHour(from = new Date()): Date {
    const d = new Date(from);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
}

/** "YYYY-MM-DD" / "HH:mm" (local) — used by the web text-input fallback */
export function toDateInput(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInput(date: Date): string {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parse "YYYY-MM-DD", "HH:mm" or "YYYY-MM-DD HH:mm" into a local Date based on `base` */
export function parseLocalInput(text: string, mode: 'date' | 'time' | 'datetime', base: Date): Date | null {
    const trimmed = text.trim();
    const dateMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(trimmed);
    const timeMatch = /(\d{1,2}):(\d{2})$/.exec(trimmed);
    const result = new Date(base);
    if (mode !== 'time') {
        if (!dateMatch) return null;
        result.setFullYear(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
        if (result.getMonth() !== Number(dateMatch[2]) - 1) return null;
    }
    if (mode !== 'date') {
        if (!timeMatch) return null;
        const h = Number(timeMatch[1]);
        const m = Number(timeMatch[2]);
        if (h > 23 || m > 59) return null;
        result.setHours(h, m, 0, 0);
    }
    return result;
}

export function deviceTimeZone(): string {
    try {
        const tz = getCalendars()[0]?.timeZone;
        if (tz) return tz;
    } catch {
        // fall through
    }
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo';
    } catch {
        return 'Asia/Tokyo';
    }
}
