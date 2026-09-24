/**
 * Browser-side storage for 1-on-1 booking secrets (docs/11_integration.md §2.7, §3)
 *
 * - Host tokens (slug -> token) are kept in localStorage so the creator's browser can
 *   reopen the management page without the e-mail link. Tokens are never put in URLs
 *   by the app; a token arriving via the e-mail link is moved here and stripped.
 * - Guest cancel tokens (booking uuid -> token) are kept in sessionStorage so the
 *   "done" page can offer cancellation without carrying the secret in the URL.
 * - In development the API returns a verify URL; it is remembered per slug for the
 *   session so the host page can link to it.
 *
 * Every access is wrapped in try/catch: storage may be unavailable (private mode,
 * blocked cookies, SSR) and the UI must still work.
 */

const HOST_TOKENS_KEY = 'booking-host-tokens';
const CANCEL_TOKENS_KEY = 'booking-cancel-tokens';
const DEV_VERIFY_KEY = 'booking-dev-verify-urls';

type Area = 'local' | 'session';

function getStorage(area: Area): Storage | null {
    try {
        if (typeof window === 'undefined') return null;
        return area === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
        return null;
    }
}

function readMap(area: Area, key: string): Record<string, string> {
    const storage = getStorage(area);
    if (!storage) return {};
    try {
        const parsed: unknown = JSON.parse(storage.getItem(key) || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return Object.fromEntries(
            Object.entries(parsed as Record<string, unknown>).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string'
            )
        );
    } catch {
        return {};
    }
}

function writeMap(area: Area, key: string, map: Record<string, string>): void {
    const storage = getStorage(area);
    if (!storage) return;
    try {
        if (Object.keys(map).length === 0) storage.removeItem(key);
        else storage.setItem(key, JSON.stringify(map));
    } catch {
        // Quota exceeded / storage disabled: nothing else we can do
    }
}

function setEntry(area: Area, key: string, id: string, value: string): void {
    if (!id || !value) return;
    writeMap(area, key, { ...readMap(area, key), [id]: value });
}

function removeEntry(area: Area, key: string, id: string): void {
    const map = readMap(area, key);
    if (!(id in map)) return;
    delete map[id];
    writeMap(area, key, map);
}

// ---------------------------------------------------------------- host tokens

export function getHostToken(slug: string): string | null {
    return readMap('local', HOST_TOKENS_KEY)[slug] ?? null;
}

export function setHostToken(slug: string, token: string): void {
    setEntry('local', HOST_TOKENS_KEY, slug, token);
}

export function removeHostToken(slug: string): void {
    removeEntry('local', HOST_TOKENS_KEY, slug);
}

// ---------------------------------------------------------------- guest cancel tokens

export function getCancelToken(bookingUuid: string): string | null {
    return readMap('session', CANCEL_TOKENS_KEY)[bookingUuid] ?? null;
}

export function setCancelToken(bookingUuid: string, token: string): void {
    setEntry('session', CANCEL_TOKENS_KEY, bookingUuid, token);
}

export function removeCancelToken(bookingUuid: string): void {
    removeEntry('session', CANCEL_TOKENS_KEY, bookingUuid);
}

// ---------------------------------------------------------------- dev-only verify URL

export function getDevVerifyUrl(slug: string): string | null {
    return readMap('session', DEV_VERIFY_KEY)[slug] ?? null;
}

export function setDevVerifyUrl(slug: string, url: string): void {
    // Only same-site relative paths are kept (the API returns "/booking/verify?...")
    if (!url.startsWith('/') || url.startsWith('//')) return;
    setEntry('session', DEV_VERIFY_KEY, slug, url);
}

export function removeDevVerifyUrl(slug: string): void {
    removeEntry('session', DEV_VERIFY_KEY, slug);
}
