/**
 * i18n React bindings. Device language via expo-localization `getLocales()`;
 * a manual choice is persisted in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { detectLocale, isLocale, translate, type Locale, type TranslateVars } from './core';

export * from './core';

const STORAGE_KEY = 'app.locale';

let currentLocale: Locale = safeDeviceLocale();

function safeDeviceLocale(): Locale {
    try {
        return detectLocale(getLocales());
    } catch {
        return 'ja';
    }
}

/** Current UI locale outside React (e.g. Accept-Language header) */
export function getCurrentLocale(): Locale {
    return currentLocale;
}

interface I18nContextValue {
    locale: Locale;
    setLocale: (locale: Locale | null) => Promise<void>;
    /** true when the user picked a language manually */
    isManual: boolean;
    t: (key: string, vars?: TranslateVars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(currentLocale);
    const [isManual, setIsManual] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let mounted = true;
        AsyncStorage.getItem(STORAGE_KEY)
            .then((saved) => {
                if (mounted && isLocale(saved)) {
                    currentLocale = saved;
                    setLocaleState(saved);
                    setIsManual(true);
                }
            })
            .catch(() => undefined)
            .finally(() => mounted && setReady(true));
        return () => {
            mounted = false;
        };
    }, []);

    const setLocale = useCallback(async (next: Locale | null) => {
        const resolved = next ?? safeDeviceLocale();
        currentLocale = resolved;
        setLocaleState(resolved);
        setIsManual(next !== null);
        try {
            if (next) await AsyncStorage.setItem(STORAGE_KEY, next);
            else await AsyncStorage.removeItem(STORAGE_KEY);
        } catch {
            // persistence is best effort
        }
    }, []);

    const value = useMemo<I18nContextValue>(
        () => ({ locale, setLocale, isManual, t: (key, vars) => translate(locale, key, vars) }),
        [locale, setLocale, isManual],
    );

    if (!ready) return null;
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
    return ctx;
}
