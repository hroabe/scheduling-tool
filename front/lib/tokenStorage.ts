/**
 * Utility for managing participant edit tokens in localStorage
 * 
 * Tokens are stored per-schedule and per-participant to enable:
 * - Editing own responses from the same browser
 * - Deleting own responses from the same browser
 */

const STORAGE_KEY_PREFIX = 'schedule_participant_token_';

interface StoredToken {
    participantId: number;
    participantName: string;
    token: string;
    createdAt: string;
}

/**
 * Store an edit token for a participant in a schedule
 */
export function storeEditToken(
    scheduleUuid: string,
    participantId: number,
    participantName: string,
    token: string
): void {
    if (typeof window === 'undefined') return;
    
    const key = `${STORAGE_KEY_PREFIX}${scheduleUuid}`;
    const stored: StoredToken = {
        participantId,
        participantName,
        token,
        createdAt: new Date().toISOString(),
    };
    
    try {
        localStorage.setItem(key, JSON.stringify(stored));
    } catch (e) {
        console.error('Failed to store edit token:', e);
    }
}

/**
 * Get the stored edit token for a schedule (if any)
 */
export function getStoredToken(scheduleUuid: string): StoredToken | null {
    if (typeof window === 'undefined') return null;
    
    const key = `${STORAGE_KEY_PREFIX}${scheduleUuid}`;
    
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        return JSON.parse(stored) as StoredToken;
    } catch (e) {
        console.error('Failed to get edit token:', e);
        return null;
    }
}

/**
 * Check if the current user has edit permission for a specific participant
 */
export function hasEditPermission(
    scheduleUuid: string,
    participantId: number
): boolean {
    const stored = getStoredToken(scheduleUuid);
    return stored?.participantId === participantId;
}

/**
 * Get the edit token for a participant if the current user owns it
 */
export function getEditTokenForParticipant(
    scheduleUuid: string,
    participantId: number
): string | null {
    const stored = getStoredToken(scheduleUuid);
    if (stored?.participantId === participantId) {
        return stored.token;
    }
    return null;
}

/**
 * Remove stored token for a schedule (e.g., after deletion)
 */
export function removeStoredToken(scheduleUuid: string): void {
    if (typeof window === 'undefined') return;
    
    const key = `${STORAGE_KEY_PREFIX}${scheduleUuid}`;
    
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error('Failed to remove edit token:', e);
    }
}
