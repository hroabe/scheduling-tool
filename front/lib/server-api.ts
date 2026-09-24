import 'server-only';

/**
 * Server-side helpers for fetching public event data (used for page metadata).
 * Never throws: metadata falls back to generic text when the API is unreachable.
 */

const INTERNAL_API_URL = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(
    /\/+$/,
    ''
);

export interface PublicEventMeta {
    name: string;
    owner_name: string;
    description: string;
    is_finalized: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export async function fetchEventMeta(uuid: string): Promise<PublicEventMeta | null> {
    if (!UUID_RE.test(uuid)) return null;
    try {
        const response = await fetch(`${INTERNAL_API_URL}/api/v1/schedules/${uuid}/`, {
            headers: {
                Accept: 'application/json',
                ...(process.env.INTERNAL_API_TOKEN ? { 'X-Internal-Token': process.env.INTERNAL_API_TOKEN } : {}),
            },
            next: { revalidate: 300 },
            signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) return null;
        const data = await response.json();
        return {
            name: String(data.name ?? ''),
            owner_name: String(data.owner_name ?? ''),
            description: String(data.description ?? ''),
            is_finalized: Boolean(data.is_finalized),
        };
    } catch {
        return null;
    }
}
