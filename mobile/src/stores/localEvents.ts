/**
 * Per-device event data: recently opened events (AsyncStorage) and secrets that let this device
 * manage an event (edit key) or edit its own response (edit token), kept in secure storage.
 */

import { getJSON, secureStorage, setJSON } from '../lib/storage';

export type EventRole = 'owner' | 'participant' | 'viewer';

export interface RecentEvent {
    uuid: string;
    name: string;
    role: EventRole;
    visitedAt: string;
}

export interface StoredResponse {
    token: string;
    participantId: number | null;
    name: string;
}

const RECENT_KEY = 'events.recent';
export const MAX_RECENT = 30;

const ROLE_RANK: Record<EventRole, number> = { viewer: 0, participant: 1, owner: 2 };

/** Insert/refresh an entry at the top; never downgrade the role; cap the list length */
export function mergeRecent(list: RecentEvent[], entry: RecentEvent): RecentEvent[] {
    const existing = list.find((item) => item.uuid === entry.uuid);
    const role = existing && ROLE_RANK[existing.role] > ROLE_RANK[entry.role] ? existing.role : entry.role;
    return [{ ...entry, role }, ...list.filter((item) => item.uuid !== entry.uuid)].slice(0, MAX_RECENT);
}

/** "<participant_id>.<secret>" -> participant id (legacy UUID tokens -> null) */
export function participantIdFromToken(token: string): number | null {
    const [head, rest] = token.split('.', 2);
    return rest !== undefined && /^\d+$/.test(head) ? Number(head) : null;
}

export async function getRecentEvents(): Promise<RecentEvent[]> {
    const list = await getJSON<RecentEvent[]>(RECENT_KEY, []);
    return Array.isArray(list) ? list : [];
}

export async function rememberEvent(uuid: string, name: string, role: EventRole): Promise<void> {
    const list = await getRecentEvents();
    await setJSON(RECENT_KEY, mergeRecent(list, { uuid, name, role, visitedAt: new Date().toISOString() }));
}

export async function forgetEvent(uuid: string): Promise<void> {
    const list = await getRecentEvents();
    await setJSON(
        RECENT_KEY,
        list.filter((item) => item.uuid !== uuid),
    );
    await Promise.all([removeEditKey(uuid), removeMyResponse(uuid)]);
}

// ---------------------------------------------------------------- edit key (organizer)

export const getEditKey = (uuid: string) => secureStorage.getItem(`editKey.${uuid}`);
export const setEditKey = (uuid: string, key: string) => secureStorage.setItem(`editKey.${uuid}`, key);
export const removeEditKey = (uuid: string) => secureStorage.removeItem(`editKey.${uuid}`);

// ---------------------------------------------------------------- response edit token (participant)

export async function getMyResponse(uuid: string): Promise<StoredResponse | null> {
    const raw = await secureStorage.getItem(`response.${uuid}`);
    if (!raw) return null;
    try {
        const value = JSON.parse(raw) as StoredResponse;
        return typeof value.token === 'string' ? value : null;
    } catch {
        return null;
    }
}

export async function setMyResponse(uuid: string, token: string, name: string): Promise<void> {
    const value: StoredResponse = { token, participantId: participantIdFromToken(token), name };
    await secureStorage.setItem(`response.${uuid}`, JSON.stringify(value));
}

export const removeMyResponse = (uuid: string) => secureStorage.removeItem(`response.${uuid}`);

// ---------------------------------------------------------------- 1-on-1 guest booking cancel token

export const getCancelToken = (bookingUuid: string) => secureStorage.getItem(`booking.${bookingUuid}`);
export const setCancelToken = (bookingUuid: string, token: string) =>
    secureStorage.setItem(`booking.${bookingUuid}`, token);

// ---------------------------------------------------------------- 1-on-1 guest reservations made on this device

export interface RecentReservation {
    uuid: string;
    slug: string;
    title: string;
    startAt: string | null;
}

const RESERVATIONS_KEY = 'bookings.recent';

export async function getReservations(slug?: string): Promise<RecentReservation[]> {
    const list = await getJSON<RecentReservation[]>(RESERVATIONS_KEY, []);
    const items = Array.isArray(list) ? list : [];
    return slug ? items.filter((item) => item.slug === slug) : items;
}

export async function rememberReservation(item: RecentReservation, cancelToken: string): Promise<void> {
    const list = await getReservations();
    await setJSON(RESERVATIONS_KEY, [item, ...list.filter((r) => r.uuid !== item.uuid)].slice(0, MAX_RECENT));
    await setCancelToken(item.uuid, cancelToken);
}
