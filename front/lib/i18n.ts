/**
 * i18n Configuration
 * RFC-0006: 多言語対応 (8 locales, Japanese is the source/default locale)
 */

export const locales = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'de', 'pt'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ja';

export const LOCALE_COOKIE = 'locale';

export const localeNames: Record<Locale, string> = {
    ja: '日本語',
    en: 'English',
    zh: '中文（简体）',
    ko: '한국어',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    pt: 'Português',
};

export function isLocale(value: string | null | undefined): value is Locale {
    return !!value && (locales as readonly string[]).includes(value);
}

/**
 * Resolve a locale from a cookie string and/or an Accept-Language style list.
 */
export function getLocaleFromRequest(acceptLanguage?: string, cookie?: string): Locale {
    if (cookie) {
        const match = cookie.match(/(?:^|;\s*)locale=([a-z-]+)/i);
        if (match && isLocale(match[1])) return match[1];
    }

    if (acceptLanguage) {
        const languages = acceptLanguage
            .split(',')
            .map((lang) => lang.trim().split(';')[0].toLowerCase())
            .filter(Boolean);
        for (const lang of languages) {
            if (isLocale(lang)) return lang;
            const base = lang.split('-')[0];
            if (isLocale(base)) return base;
        }
    }

    return defaultLocale;
}
