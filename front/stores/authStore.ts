/**
 * Auth Store - Zustand store for authentication state
 * RFC-0003: ユーザー認証/アカウント機能
 * RFC-0011: Keycloak認証統合 (optional; enabled when NEXT_PUBLIC_KEYCLOAK_URL is set)
 *
 * Web sessions use the Django session cookie (+ CSRF). When Keycloak is enabled, the
 * OIDC access token is sent as `Authorization: Bearer` and refreshed automatically.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import api, { ApiError, configureAuth } from '@/lib/api';
import {
    buildAuthUrl,
    buildLogoutUrl,
    exchangeCodeForTokens,
    isKeycloakEnabled,
    keycloakConfig,
    refreshAccessToken,
} from '@/lib/keycloak';
import type { RegisterInput, User } from '@/types';

interface TokenState {
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
    expiresAt: number | null;
}

const EMPTY_TOKENS: TokenState = { accessToken: null, refreshToken: null, idToken: null, expiresAt: null };

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    /** true once checkAuth() has completed at least once in this page load */
    isChecked: boolean;
    tokens: TokenState;

    login: (usernameOrEmail: string, password: string) => Promise<User>;
    register: (data: RegisterInput) => Promise<User>;
    loginWithKeycloak: (returnTo?: string) => Promise<void>;
    completeKeycloakLogin: (code: string, state: string | null) => Promise<string>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    updateProfile: (data: Partial<User> & Record<string, unknown>) => Promise<void>;
    getValidAccessToken: () => Promise<string | null>;
}

const safeStorage = () =>
    typeof window === 'undefined'
        ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
        : window.localStorage;

let refreshing: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isChecked: false,
            tokens: EMPTY_TOKENS,

            login: async (usernameOrEmail, password) => {
                set({ isLoading: true });
                try {
                    const response = await api.login(usernameOrEmail, password);
                    set({ user: response.user, isAuthenticated: true, isChecked: true });
                    return response.user;
                } finally {
                    set({ isLoading: false });
                }
            },

            register: async (data) => {
                set({ isLoading: true });
                try {
                    const response = await api.register(data);
                    set({ user: response.user, isAuthenticated: true, isChecked: true });
                    return response.user;
                } finally {
                    set({ isLoading: false });
                }
            },

            // Keycloak OIDC login (Authorization Code + PKCE)
            loginWithKeycloak: async (returnTo = '/account') => {
                const redirectUri = `${window.location.origin}/callback`;
                const state = crypto.randomUUID();
                sessionStorage.setItem('oauth_state', state);
                sessionStorage.setItem('oauth_return_to', returnTo.startsWith('/') ? returnTo : '/account');
                const { url, codeVerifier } = await buildAuthUrl(keycloakConfig, redirectUri, state);
                sessionStorage.setItem('pkce_verifier', codeVerifier);
                window.location.href = url;
            },

            completeKeycloakLogin: async (code, state) => {
                const expectedState = sessionStorage.getItem('oauth_state');
                const verifier = sessionStorage.getItem('pkce_verifier');
                const returnTo = sessionStorage.getItem('oauth_return_to') || '/account';
                sessionStorage.removeItem('oauth_state');
                sessionStorage.removeItem('pkce_verifier');
                sessionStorage.removeItem('oauth_return_to');
                if (!state || !expectedState || state !== expectedState || !verifier) {
                    throw new Error('invalid_state');
                }
                const tokens = await exchangeCodeForTokens(
                    keycloakConfig,
                    code,
                    `${window.location.origin}/callback`,
                    verifier
                );
                set({
                    tokens: {
                        accessToken: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        idToken: tokens.id_token,
                        expiresAt: Date.now() + tokens.expires_in * 1000,
                    },
                    isAuthenticated: true,
                });
                const user = await api.getMe();
                set({ user, isChecked: true });
                return returnTo;
            },

            logout: async () => {
                const { tokens } = get();
                set({ isLoading: true });
                await api.logout().catch(() => undefined);
                set({ user: null, isAuthenticated: false, isLoading: false, tokens: EMPTY_TOKENS });
                if (tokens.idToken && isKeycloakEnabled) {
                    window.location.href = buildLogoutUrl(keycloakConfig, window.location.origin, tokens.idToken);
                }
            },

            checkAuth: async () => {
                const { isAuthenticated, tokens } = get();
                // Skip the round-trip for visitors who never signed in on this browser
                if (!isAuthenticated && !tokens.accessToken) {
                    set({ isChecked: true });
                    return;
                }
                try {
                    const user = await api.getMe();
                    set({ user, isAuthenticated: true, isChecked: true });
                } catch (error) {
                    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                        set({ user: null, isAuthenticated: false, tokens: EMPTY_TOKENS });
                    }
                    set({ isChecked: true });
                }
            },

            updateProfile: async (data) => {
                set({ isLoading: true });
                try {
                    const user = await api.updateMe(data);
                    set({ user });
                } finally {
                    set({ isLoading: false });
                }
            },

            getValidAccessToken: async () => {
                const { tokens } = get();
                if (!tokens.accessToken) return null;
                if (!tokens.expiresAt || tokens.expiresAt > Date.now() + 30_000) return tokens.accessToken;
                if (!tokens.refreshToken) return null;
                refreshing ??= refreshAccessToken(keycloakConfig, tokens.refreshToken)
                    .then((fresh) => {
                        set((state) => ({
                            tokens: {
                                ...state.tokens,
                                accessToken: fresh.access_token,
                                refreshToken: fresh.refresh_token ?? state.tokens.refreshToken,
                                expiresAt: Date.now() + fresh.expires_in * 1000,
                            },
                        }));
                        return fresh.access_token;
                    })
                    .catch(() => {
                        set({ user: null, isAuthenticated: false, tokens: EMPTY_TOKENS });
                        return null;
                    })
                    .finally(() => {
                        refreshing = null;
                    });
                return refreshing;
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(safeStorage),
            partialize: (state) => ({ isAuthenticated: state.isAuthenticated, tokens: state.tokens }),
        }
    )
);

// Let the API client attach the (refreshed) bearer token and react to expired sessions
configureAuth({
    getAccessToken: () => useAuthStore.getState().getValidAccessToken(),
    onUnauthorized: () => {
        if (useAuthStore.getState().isAuthenticated) {
            useAuthStore.setState({ user: null, isAuthenticated: false, tokens: EMPTY_TOKENS });
        }
    },
});
