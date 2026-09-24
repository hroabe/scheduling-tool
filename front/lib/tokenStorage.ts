/**
 * Legacy response-token storage (origin/main) → useMyResponsesStore migration
 *
 * origin/main kept response edit tokens in localStorage under
 * `schedule_participant_token_<uuid>`. They now live in `useMyResponsesStore`
 * (docs/11_integration.md §3). `migrateLegacyTokens()` moves every legacy entry into the
 * store once (an existing store entry wins) and deletes the legacy keys.
 */

import type { MyResponse } from '@/stores';

export const LEGACY_TOKEN_PREFIX = 'schedule_participant_token_';

interface LegacyStoredToken {
    participantId: number;
    participantName?: string;
    token: string;
}

function parseLegacy(raw: string | null): LegacyStoredToken | null {
    if (!raw) return null;
    try {
        const value = JSON.parse(raw) as Partial<LegacyStoredToken>;
        if (typeof value.participantId === 'number' && typeof value.token === 'string' && value.token) {
            return { participantId: value.participantId, participantName: value.participantName, token: value.token };
        }
    } catch {
        // Corrupted entry: dropped below
    }
    return null;
}

/**
 * Move legacy tokens into the responses store.
 * @param existing current store entries (uuid → response); entries already present are kept
 * @param save store setter
 * @returns number of migrated entries
 */
export function migrateLegacyTokens(
    existing: Record<string, MyResponse>,
    save: (uuid: string, response: MyResponse) => void
): number {
    if (typeof window === 'undefined') return 0;
    let storage: Storage;
    try {
        storage = window.localStorage;
    } catch {
        return 0;
    }

    const legacyKeys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key?.startsWith(LEGACY_TOKEN_PREFIX)) legacyKeys.push(key);
    }

    let migrated = 0;
    for (const key of legacyKeys) {
        const uuid = key.slice(LEGACY_TOKEN_PREFIX.length);
        const legacy = parseLegacy(storage.getItem(key));
        if (uuid && legacy && !existing[uuid]) {
            save(uuid, { participantId: legacy.participantId, name: legacy.participantName ?? '', editToken: legacy.token });
            migrated += 1;
        }
        storage.removeItem(key);
    }
    return migrated;
}
