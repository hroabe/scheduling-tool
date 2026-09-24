/**
 * Auth store (RFC-0003) — DRF token auth for mobile.
 * The token lives in secure storage; the user object is refreshed from /accounts/me/ on start.
 */

import { create } from 'zustand';

import type { ProfileUpdateInput, RegisterInput, User } from '../api/types';
import { secureStorage } from '../lib/storage';
import { api } from '../api';
import { setSessionToken } from '../api/session';

const TOKEN_KEY = 'auth.token';

interface AuthState {
    token: string | null;
    user: User | null;
    hydrated: boolean;
    hydrate: () => Promise<void>;
    login: (username: string, password: string) => Promise<void>;
    register: (input: RegisterInput) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    updateProfile: (input: ProfileUpdateInput) => Promise<void>;
    /** Drop the local session (e.g. the server rejected the token) */
    clearSession: () => void;
}

async function saveToken(token: string | null) {
    setSessionToken(token);
    if (token) await secureStorage.setItem(TOKEN_KEY, token);
    else await secureStorage.removeItem(TOKEN_KEY);
}

export const useAuthStore = create<AuthState>()((set, get) => ({
    token: null,
    user: null,
    hydrated: false,

    hydrate: async () => {
        const token = await secureStorage.getItem(TOKEN_KEY);
        setSessionToken(token);
        set({ token, hydrated: true });
        if (token) {
            // Network errors keep the token (offline start); a 401 clears it via onUnauthorized
            await get().refreshUser().catch(() => undefined);
        }
    },

    login: async (username, password) => {
        const res = await api.login(username, password);
        if (!res.token) throw new Error('The server did not issue an API token.');
        await saveToken(res.token);
        set({ token: res.token, user: res.user });
    },

    register: async (input) => {
        const res = await api.register(input);
        if (!res.token) throw new Error('The server did not issue an API token.');
        await saveToken(res.token);
        set({ token: res.token, user: res.user });
    },

    logout: async () => {
        try {
            if (get().token) await api.logout(); // revokes the token server-side
        } catch {
            // logging out locally is enough if the server is unreachable
        } finally {
            await saveToken(null);
            set({ token: null, user: null });
        }
    },

    refreshUser: async () => {
        if (!get().token) return;
        const user = await api.me();
        if (get().token) set({ user });
    },

    updateProfile: async (input) => {
        const user = await api.updateMe(input);
        set({ user });
    },

    clearSession: () => {
        saveToken(null).catch(() => undefined);
        set({ token: null, user: null });
    },
}));

export const useIsLoggedIn = () => useAuthStore((s) => !!s.token);
