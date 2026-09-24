/**
 * Storage helpers.
 *
 * Secrets (auth token, organizer edit keys, response edit tokens, booking cancel tokens) go to
 * expo-secure-store (Keychain / Keystore) on iOS/Android. On web — where SecureStore is not
 * available — they fall back to AsyncStorage (localStorage), matching the web app's behaviour.
 * Non-secret data (recent events, preferences) always uses AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const useSecureStore = Platform.OS === 'ios' || Platform.OS === 'android';

/** SecureStore keys may only contain alphanumerics, ".", "-" and "_" */
export function toStorageKey(key: string): string {
    return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

export const secureStorage = {
    async getItem(key: string): Promise<string | null> {
        const k = toStorageKey(key);
        try {
            return useSecureStore ? await SecureStore.getItemAsync(k) : await AsyncStorage.getItem(`secure.${k}`);
        } catch {
            return null;
        }
    },
    async setItem(key: string, value: string): Promise<void> {
        const k = toStorageKey(key);
        if (useSecureStore) await SecureStore.setItemAsync(k, value);
        else await AsyncStorage.setItem(`secure.${k}`, value);
    },
    async removeItem(key: string): Promise<void> {
        const k = toStorageKey(key);
        try {
            if (useSecureStore) await SecureStore.deleteItemAsync(k);
            else await AsyncStorage.removeItem(`secure.${k}`);
        } catch {
            // ignore
        }
    },
};

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
        // best effort
    }
}
