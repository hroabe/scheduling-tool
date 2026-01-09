/**
 * Auth Store - Zustand store for authentication state
 * RFC-0003: ユーザー認証/アカウント機能
 * RFC-0011: Keycloak認証統合
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import api from '@/lib/api';
import { keycloakConfig, buildAuthUrl, buildLogoutUrl, refreshAccessToken } from '@/lib/keycloak';

interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: number | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tokens: TokenState;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: Partial<TokenState>) => void;
  login: (username: string, password: string) => Promise<void>;
  loginWithKeycloak: () => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
  }) => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshTokens: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      tokens: {
        accessToken: null,
        refreshToken: null,
        idToken: null,
        expiresAt: null,
      },

      setUser: (user) => set({
        user,
        isAuthenticated: !!user
      }),

      setTokens: (tokens) => set((state) => ({
        tokens: { ...state.tokens, ...tokens },
        isAuthenticated: !!tokens.accessToken
      })),

      // Legacy login (session-based) - will be deprecated
      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const response = await api.login(username, password);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Keycloak OIDC login (with PKCE)
      loginWithKeycloak: async () => {
        const redirectUri = `${window.location.origin}/callback`;
        const state = crypto.randomUUID();
        sessionStorage.setItem('oauth_state', state);

        const { url, codeVerifier } = await buildAuthUrl(keycloakConfig, redirectUri, state);
        sessionStorage.setItem('pkce_verifier', codeVerifier);
        window.location.href = url;
      },

      logout: async () => {
        set({ isLoading: true });
        const { tokens } = get();

        try {
          // Try legacy logout
          await api.logout().catch(() => { });

          // Keycloak logout if we have tokens
          if (tokens.idToken) {
            const logoutUrl = buildLogoutUrl(
              keycloakConfig,
              window.location.origin,
              tokens.idToken
            );

            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              tokens: {
                accessToken: null,
                refreshToken: null,
                idToken: null,
                expiresAt: null,
              }
            });

            window.location.href = logoutUrl;
            return;
          }
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            tokens: {
              accessToken: null,
              refreshToken: null,
              idToken: null,
              expiresAt: null,
            }
          });
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await api.register(data);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      checkAuth: async () => {
        const { tokens, refreshTokens } = get();

        // Check if token needs refresh
        if (tokens.expiresAt && tokens.expiresAt < Date.now() + 60000) {
          await refreshTokens();
        }

        try {
          const user = await api.getMe();
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true });
        try {
          const user = await api.updateMe(data);
          set({ user, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      refreshTokens: async () => {
        const { tokens } = get();

        if (!tokens.refreshToken) {
          return false;
        }

        try {
          const newTokens = await refreshAccessToken(keycloakConfig, tokens.refreshToken);
          set((state) => ({
            tokens: {
              ...state.tokens,
              accessToken: newTokens.access_token,
              refreshToken: newTokens.refresh_token,
              expiresAt: Date.now() + newTokens.expires_in * 1000,
            }
          }));
          return true;
        } catch {
          // Token refresh failed, clear auth state
          set({
            user: null,
            isAuthenticated: false,
            tokens: {
              accessToken: null,
              refreshToken: null,
              idToken: null,
              expiresAt: null,
            }
          });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        tokens: state.tokens,
      }),
    }
  )
);

