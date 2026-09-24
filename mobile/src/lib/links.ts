/**
 * Deep-link / shared-link parsing (pure).
 *
 * Supported:
 *   schedulingtool://event/<uuid>            https://<host>/event/<uuid>[/edit]
 *   schedulingtool://booking/<slug>          https://<host>/booking/<slug>[/done]
 *   schedulingtool://create                  https://<host>/create
 *   a bare event UUID (pasted on the Home screen)
 */

export const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const SLUG_RE = /^[-a-zA-Z0-9_]{3,100}$/;
/** /booking/<x> paths of the web app that are not guest booking pages */
const RESERVED_BOOKING_SEGMENTS = new Set(['cancel', 'verify', 'new']);

export type LinkTarget =
    | { name: 'EventDetail'; params: { uuid: string } }
    | { name: 'Booking'; params: { slug: string } }
    | { name: 'CreateEvent'; params?: undefined };

/** Path part of a URL. For custom schemes ("schedulingtool://event/x") the host is the first segment. */
export function pathFromUrl(url: string): string {
    const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)/i.exec(url.trim());
    if (!match) return url.trim().replace(/[?#].*$/, '');
    const [, scheme, host, rest] = match;
    const lower = scheme.toLowerCase();
    if (lower === 'http' || lower === 'https') return rest || '/';
    // exp://127.0.0.1:8081/--/event/x (Expo Go development links)
    const expoGo = /\/--(\/.*)$/.exec(rest);
    if (expoGo) return expoGo[1];
    return `/${host}${rest}`;
}

export function routeFromPath(path: string): LinkTarget | null {
    const segments = path
        .replace(/[?#].*$/, '')
        .split('/')
        .filter(Boolean)
        .map((s) => {
            try {
                return decodeURIComponent(s);
            } catch {
                return s;
            }
        });
    if (segments.length === 0) return null;
    const [first, second, third] = segments;

    if (first === 'event' && second && UUID_RE.test(second) && second.length === 36) {
        if (segments.length === 2 || (segments.length === 3 && third === 'edit')) {
            return { name: 'EventDetail', params: { uuid: second.toLowerCase() } };
        }
        return null;
    }
    if (first === 'booking' && second && !RESERVED_BOOKING_SEGMENTS.has(second) && SLUG_RE.test(second)) {
        if (segments.length === 2 || (segments.length === 3 && third === 'done')) {
            return { name: 'Booking', params: { slug: second } };
        }
        return null;
    }
    if (first === 'create' && segments.length === 1) return { name: 'CreateEvent' };
    return null;
}

export function routeFromUrl(url: string): LinkTarget | null {
    return routeFromPath(pathFromUrl(url));
}

/** Text pasted by the user: a share URL, an app link, or just the event UUID */
export function parseUserInput(text: string): LinkTarget | null {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const fromUrl = routeFromUrl(trimmed);
    if (fromUrl) return fromUrl;
    const uuid = UUID_RE.exec(trimmed);
    return uuid ? { name: 'EventDetail', params: { uuid: uuid[0].toLowerCase() } } : null;
}
