/**
 * Date utility functions
 */

import { format, formatDistance, isBefore, isValid, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

function toDate(date: string | Date): Date {
    return typeof date === 'string' ? parseISO(date) : date;
}

/**
 * Format a date string for display
 */
export function formatDate(date: string | Date, formatStr = 'yyyy/MM/dd'): string {
    const d = toDate(date);
    if (!isValid(d)) return '';
    return format(d, formatStr, { locale: ja });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | Date): string {
    return formatDate(date, 'yyyy/MM/dd (E) HH:mm');
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
    return formatDate(date, 'HH:mm');
}

/**
 * Format a date range, e.g. "2026/04/01 (水) 10:00 - 11:00"
 */
export function formatDateRange(start: string | Date, end: string | Date): string {
    const startDate = toDate(start);
    const endDate = toDate(end);
    if (!isValid(startDate) || !isValid(endDate)) return '';

    const sameDay = format(startDate, 'yyyyMMdd') === format(endDate, 'yyyyMMdd');
    const startStr = format(startDate, 'yyyy/MM/dd (E) HH:mm', { locale: ja });
    const endStr = format(endDate, sameDay ? 'HH:mm' : 'MM/dd (E) HH:mm', { locale: ja });
    return `${startStr} - ${endStr}`;
}

/**
 * Format relative time (e.g., "3日前")
 */
export function formatRelative(date: string | Date): string {
    const d = toDate(date);
    if (!isValid(d)) return '';
    return formatDistance(d, new Date(), { addSuffix: true, locale: ja });
}

/**
 * Check if a deadline has passed
 */
export function isDeadlinePassed(deadline: string | null | undefined): boolean {
    if (!deadline) return false;
    const d = parseISO(deadline);
    return isValid(d) && isBefore(d, new Date());
}

/**
 * Build an ISO-8601 string (with the browser's UTC offset applied) from a
 * local calendar date and a "HH:mm" time.
 */
export function combineDateAndTime(date: Date, time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours || 0, minutes || 0, 0, 0);
    return d.toISOString();
}

/**
 * Convert a `datetime-local` input value to an ISO string (or null when empty)
 */
export function localInputToISO(value: string | undefined | null): string | null {
    if (!value) return null;
    const d = new Date(value);
    return isValid(d) ? d.toISOString() : null;
}

/**
 * Convert an ISO string to a `datetime-local` input value
 */
export function toLocalDateTimeString(date: string | Date): string {
    const d = toDate(date);
    return isValid(d) ? format(d, "yyyy-MM-dd'T'HH:mm") : '';
}

/**
 * Stable key for a calendar day (local time)
 */
export function toDayKey(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

/**
 * Minutes between two "HH:mm" strings (negative when end is before start)
 */
export function minutesBetween(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return eh * 60 + em - (sh * 60 + sm);
}

/**
 * Google Calendar "add event" URL (no OAuth required)
 */
export function googleCalendarUrl(params: {
    title: string;
    start: string;
    end: string;
    details?: string;
}): string {
    const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const search = new URLSearchParams({
        action: 'TEMPLATE',
        text: params.title,
        dates: `${fmt(params.start)}/${fmt(params.end)}`,
    });
    if (params.details) search.set('details', params.details);
    return `https://calendar.google.com/calendar/render?${search.toString()}`;
}
