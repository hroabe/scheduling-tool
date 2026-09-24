const FALLBACK_TIMEZONES = [
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'Pacific/Auckland',
    'UTC',
];

/** IANA time zones supported by the browser (with a short fallback list) */
export function listTimezones(current?: string | null): string[] {
    let zones: string[] = FALLBACK_TIMEZONES;
    try {
        const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
        if (supported) zones = supported('timeZone');
    } catch {
        // keep the fallback list
    }
    if (!zones.includes('UTC')) zones = [...zones, 'UTC'];
    return current && !zones.includes(current) ? [current, ...zones] : zones;
}

/** The browser's time zone, e.g. "Asia/Tokyo" */
export function browserTimezone(fallback = 'Asia/Tokyo'): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
    } catch {
        return fallback;
    }
}
