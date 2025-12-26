/**
 * Date utility functions
 */

import {
    format,
    formatDistance,
    parseISO,
    isValid,
    isBefore,
    isAfter,
    addMinutes,
    setHours,
    setMinutes,
    startOfDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * Format a date string for display
 */
export function formatDate(date: string | Date, formatStr = 'yyyy/MM/dd'): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return format(d, formatStr, { locale: ja });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: string | Date): string {
    return formatDate(date, 'yyyy/MM/dd HH:mm');
}

/**
 * Format time only
 */
export function formatTime(date: string | Date): string {
    return formatDate(date, 'HH:mm');
}

/**
 * Format a date range
 */
export function formatDateRange(start: string | Date, end: string | Date): string {
    const startDate = typeof start === 'string' ? parseISO(start) : start;
    const endDate = typeof end === 'string' ? parseISO(end) : end;

    const startStr = format(startDate, 'yyyy/MM/dd (E) HH:mm', { locale: ja });
    const endStr = format(endDate, 'HH:mm', { locale: ja });

    return `${startStr} - ${endStr}`;
}

/**
 * Format relative time (e.g., "3日前")
 */
export function formatRelative(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return formatDistance(d, new Date(), { addSuffix: true, locale: ja });
}

/**
 * Get day of week in Japanese
 */
export function getDayOfWeek(date: string | Date): string {
    return formatDate(date, 'E');
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
 * Create a date from date and time parts
 */
export function createDateTime(
    date: Date,
    hours: number,
    minutes: number
): Date {
    return setMinutes(setHours(startOfDay(date), hours), minutes);
}

/**
 * Generate time options for a time picker
 */
export function generateTimeOptions(
    step = 30,
    startHour = 0,
    endHour = 24
): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += step) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            options.push({ value: timeStr, label: timeStr });
        }
    }

    return options;
}

/**
 * Parse time string to hours and minutes
 */
export function parseTimeString(time: string): { hours: number; minutes: number } {
    const [hours, minutes] = time.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
}

/**
 * Convert ISO string to local date for input
 */
export function toLocalDateString(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'yyyy-MM-dd');
}

/**
 * Convert ISO string to local datetime for input
 */
export function toLocalDateTimeString(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, "yyyy-MM-dd'T'HH:mm");
}
