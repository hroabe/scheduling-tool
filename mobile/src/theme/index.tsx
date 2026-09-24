/**
 * Theme provider: follows the OS colour scheme (useColorScheme) unless the user forces light/dark,
 * plus the optional "cute" palette (RFC-0008 Phase 2). Preferences are stored in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { getAvailabilitySymbols, type AvailabilitySymbols } from '../lib/symbols';
import { useI18n } from '../i18n';
import { buildTheme, resolveScheme, type Theme, type ThemeMode } from './palette';

export * from './palette';

const STORAGE_KEY = 'app.theme';

interface ThemePreference {
    mode: ThemeMode;
    cute: boolean;
}

interface ThemeContextValue extends Theme {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    setCute: (cute: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function parseThemePreference(raw: string | null): ThemePreference {
    const fallback: ThemePreference = { mode: 'system', cute: false };
    if (!raw) return fallback;
    try {
        const value = JSON.parse(raw) as Partial<ThemePreference>;
        return {
            mode: value.mode === 'light' || value.mode === 'dark' ? value.mode : 'system',
            cute: value.cute === true,
        };
    } catch {
        return fallback;
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const system = useColorScheme();
    const [pref, setPref] = useState<ThemePreference>({ mode: 'system', cute: false });

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((raw) => setPref(parseThemePreference(raw)))
            .catch(() => undefined);
    }, []);

    const update = useCallback((patch: Partial<ThemePreference>) => {
        setPref((prev) => {
            const next = { ...prev, ...patch };
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
            return next;
        });
    }, []);

    const value = useMemo<ThemeContextValue>(() => {
        const theme = buildTheme(resolveScheme(pref.mode, system), pref.cute);
        return {
            ...theme,
            mode: pref.mode,
            setMode: (mode) => update({ mode }),
            setCute: (cute) => update({ cute }),
        };
    }, [pref, system, update]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
}

/** ◯△× / ✓?✗ / 😊🤔😢 depending on language and cute mode (meaning is always also shown as text) */
export function useAvailabilitySymbols(): AvailabilitySymbols {
    const { locale } = useI18n();
    const { cute } = useTheme();
    return getAvailabilitySymbols(locale, cute);
}
