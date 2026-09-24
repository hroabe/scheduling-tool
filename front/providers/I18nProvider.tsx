'use client';

/**
 * i18n Provider and hooks (RFC-0006, revised in docs/11_integration.md)
 *
 * - Japanese messages are bundled statically, so server-rendered HTML always contains
 *   real text (never raw keys) and SEO/first paint are unaffected.
 * - Other locales are loaded on demand in the browser (cookie > navigator.language).
 * - Missing keys fall back to Japanese, then to the key itself.
 * - `t('ns.key', { name: 'x' })` interpolates `{name}` placeholders.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setDateLocale } from '@/lib/date';
import { defaultLocale, getLocaleFromRequest, isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import jaMessages from '@/messages/ja';

export type Messages = typeof jaMessages;
type Vars = Record<string, string | number>;

interface I18nContextType {
    locale: Locale;
    t: (key: string, vars?: Vars) => string;
    setLocale: (locale: Locale) => void;
    isLoading: boolean;
}

const loaders: Record<Locale, () => Promise<{ default: unknown }>> = {
    ja: () => Promise.resolve({ default: jaMessages }),
    en: () => import('@/messages/en'),
    zh: () => import('@/messages/zh'),
    ko: () => import('@/messages/ko'),
    es: () => import('@/messages/es'),
    fr: () => import('@/messages/fr'),
    de: () => import('@/messages/de'),
    pt: () => import('@/messages/pt'),
};

function lookup(messages: unknown, key: string): string | undefined {
    let node: unknown = messages;
    for (const part of key.split('.')) {
        if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
            node = (node as Record<string, unknown>)[part];
        } else {
            return undefined;
        }
    }
    return typeof node === 'string' ? node : undefined;
}

function interpolate(template: string, vars?: Vars): string {
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function translate(messages: unknown, key: string, vars?: Vars): string {
    return interpolate(lookup(messages, key) ?? lookup(jaMessages, key) ?? key, vars);
}

const I18nContext = createContext<I18nContextType | null>(null);

function readCookieLocale(): Locale | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([a-zA-Z-]+)`));
    return match && isLocale(match[1]) ? match[1] : null;
}

export function I18nProvider({ children, initialLocale = defaultLocale }: { children: ReactNode; initialLocale?: Locale }) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale);
    const [messages, setMessages] = useState<unknown>(jaMessages);
    const [isLoading, setIsLoading] = useState(false);

    // Detect the preferred locale once mounted (server always renders Japanese)
    useEffect(() => {
        const preferred = readCookieLocale() ?? getLocaleFromRequest(navigator.languages?.join(',') || navigator.language);
        if (preferred !== locale) setLocaleState(preferred);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale;
        setDateLocale(locale);
        // Japanese is bundled: nothing to load (and no re-render of every translated component)
        if (locale === defaultLocale) {
            setMessages((current: unknown) => (current === jaMessages ? current : jaMessages));
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        loaders[locale]()
            .then((mod) => {
                if (!cancelled) setMessages(mod.default);
            })
            .catch(() => {
                if (!cancelled) setMessages(jaMessages);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [locale]);

    const setLocale = useCallback((next: Locale) => {
        document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
        setLocaleState(next);
    }, []);

    const t = useCallback((key: string, vars?: Vars) => translate(messages, key, vars), [messages]);

    const value = useMemo(() => ({ locale, t, setLocale, isLoading }), [locale, t, setLocale, isLoading]);
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

const fallbackContext: I18nContextType = {
    locale: defaultLocale,
    t: (key, vars) => translate(jaMessages, key, vars),
    setLocale: () => undefined,
    isLoading: false,
};

/** Hook to access i18n context (falls back to Japanese outside the provider, e.g. in unit tests) */
export function useI18n(): I18nContextType {
    return useContext(I18nContext) ?? fallbackContext;
}

/** Hook for the translation function only */
export function useTranslation() {
    const { t, locale } = useI18n();
    return { t, locale };
}
