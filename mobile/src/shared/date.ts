// Copied and adapted from front/lib/date.ts
import {
    format,
    formatDistance,
    parseISO,
    isValid,
    isBefore,
    setHours,
    setMinutes,
    startOfDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';

export function formatDate(date: string | Date, formatStr = 'yyyy/MM/dd'): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return format(d, formatStr, { locale: ja });
}

export function formatDateTime(date: string | Date): string {
    return formatDate(date, 'yyyy/MM/dd HH:mm');
}

export function formatTime(date: string | Date): string {
    return formatDate(date, 'HH:mm');
}

export function formatRelative(date: string | Date): string {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return formatDistance(d, new Date(), { addSuffix: true, locale: ja });
}

export function getDayOfWeek(date: string | Date): string {
    return formatDate(date, 'E');
}

export function isDeadlinePassed(deadline: string | null | undefined): boolean {
    if (!deadline) return false;
    const d = parseISO(deadline);
    return isValid(d) && isBefore(d, new Date());
}

export function createDateTime(
    date: Date,
    hours: number,
    minutes: number
): Date {
    return setMinutes(setHours(startOfDay(date), hours), minutes);
}

export function parseTimeString(time: string): { hours: number; minutes: number } {
    const [hours, minutes] = time.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
}
