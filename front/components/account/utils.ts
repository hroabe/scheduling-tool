import { ApiError, extractErrorMessage } from '@/lib/api';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Only same-origin, absolute paths are accepted as post-login destinations
 * (prevents open redirects via ?next=https://evil.example or //evil.example).
 */
export function safeNextPath(next: string | null | undefined, fallback = '/account'): string {
    if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
    return next;
}

/** Human-readable, translated message for an error thrown by lib/api.ts */
export function apiErrorMessage(error: unknown, t: Translate): string {
    if (error instanceof ApiError) {
        if (error.status === 429) return t('errors.throttled');
        if (error.status === 401) return t('errors.unauthorized');
        if (error.status === 403) return t('errors.permissionDenied');
        if (error.status === 404) return t('errors.notFound');
        if (error.status >= 500) return t('errors.serverError');
        // 400: the server explains what is wrong with the input
        return extractErrorMessage(error.data) || t('errors.invalidRequest');
    }
    if (error instanceof TypeError) return t('errors.networkError');
    return t('errors.unknown');
}

/** DRF field errors ({"email": ["..."]}) flattened to the first message per field */
export function fieldErrors(error: unknown): Record<string, string> {
    if (!(error instanceof ApiError) || error.status !== 400 || !error.data || typeof error.data !== 'object') return {};
    const result: Record<string, string> = {};
    for (const [field, value] of Object.entries(error.data)) {
        if (field === 'detail' || field === 'error' || field === 'non_field_errors') continue;
        const message = extractErrorMessage(value);
        if (message) result[field] = message;
    }
    return result;
}
