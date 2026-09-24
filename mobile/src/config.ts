/**
 * Runtime configuration.
 *
 * API base URL precedence:
 *   1. EXPO_PUBLIC_API_URL (inlined at build time)
 *   2. app.json / app.config.ts `expo.extra.apiUrl`
 *   3. Development default derived from the Metro host (works on a physical device with Expo Go)
 *   4. Platform default: Android emulator -> http://10.0.2.2:8000, others -> http://localhost:8000
 *
 * Web (Next.js) URL — used for share links and deep links — precedence:
 *   EXPO_PUBLIC_WEB_URL > extra.webUrl > http://localhost:3000
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const DEFAULT_API_PORT = 8000;
export const DEFAULT_WEB_URL = 'http://localhost:3000';

export function stripTrailingSlash(url: string): string {
    return url.replace(/\/+$/, '');
}

function nonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export interface ResolveApiUrlInput {
    envUrl?: string | null;
    extraUrl?: unknown;
    platform: string;
    /** Metro dev server host, e.g. "192.168.1.10:8081" (only available in development) */
    hostUri?: string | null;
}

export function resolveApiUrl({ envUrl, extraUrl, platform, hostUri }: ResolveApiUrlInput): string {
    const explicit = nonEmptyString(envUrl) ?? nonEmptyString(extraUrl);
    if (explicit) return stripTrailingSlash(explicit);

    if (platform !== 'web' && hostUri) {
        const host = hostUri.split('/')[0].split(':')[0];
        // "localhost" on a device/emulator points at the device itself, so only use real hosts
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
            return `http://${host}:${DEFAULT_API_PORT}`;
        }
    }
    if (platform === 'android') return `http://10.0.2.2:${DEFAULT_API_PORT}`;
    return `http://localhost:${DEFAULT_API_PORT}`;
}

export function resolveWebUrl(envUrl?: string | null, extraUrl?: unknown): string {
    return stripTrailingSlash(nonEmptyString(envUrl) ?? nonEmptyString(extraUrl) ?? DEFAULT_WEB_URL);
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const API_URL = resolveApiUrl({
    envUrl: process.env.EXPO_PUBLIC_API_URL,
    extraUrl: extra.apiUrl,
    platform: Platform.OS,
    hostUri: Constants.expoConfig?.hostUri ?? null,
});

export const WEB_URL = resolveWebUrl(process.env.EXPO_PUBLIC_WEB_URL, extra.webUrl);

/** Custom URL scheme registered in app.json (`expo.scheme`) */
export const APP_SCHEME = 'schedulingtool';
