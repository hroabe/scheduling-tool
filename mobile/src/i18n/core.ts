/**
 * i18n core (pure, no React / native modules) — RFC-0006.
 *
 * - 8 locales; `ja` is the source of truth and the fallback for missing keys.
 * - Keys are dotted paths ("event.respond.title"); variables use {{name}}.
 */

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import pt from './locales/pt.json';
import zh from './locales/zh.json';

export const SUPPORTED_LOCALES = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'de', 'pt'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ja';

/** Native names shown in the language picker */
export const LOCALE_NAMES: Record<Locale, string> = {
    ja: '日本語',
    en: 'English',
    zh: '中文',
    ko: '한국어',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    pt: 'Português',
};

export type Dictionary = { [key: string]: string | Dictionary };

export const dictionaries: Record<Locale, Dictionary> = { ja, en, zh, ko, es, fr, de, pt };

export type TranslateVars = Record<string, string | number>;

export function isLocale(value: unknown): value is Locale {
    return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function lookup(dict: Dictionary, key: string): string | undefined {
    let node: string | Dictionary | undefined = dict;
    for (const part of key.split('.')) {
        if (!node || typeof node === 'string') return undefined;
        node = node[part];
    }
    return typeof node === 'string' ? node : undefined;
}

export function interpolate(template: string, vars?: TranslateVars): string {
    if (!vars) return template;
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
        vars[name] !== undefined ? String(vars[name]) : match,
    );
}

export function translate(locale: Locale, key: string, vars?: TranslateVars): string {
    const text = lookup(dictionaries[locale], key) ?? lookup(dictionaries[DEFAULT_LOCALE], key) ?? key;
    return interpolate(text, vars);
}

/**
 * Pick a supported locale from the device preferences (expo-localization `getLocales()`).
 * Unsupported languages fall back to English (the app is also used outside Japan).
 */
export function detectLocale(preferred: { languageCode?: string | null; languageTag?: string | null }[]): Locale {
    for (const item of preferred) {
        const code = (item.languageCode ?? item.languageTag?.split('-')[0] ?? '').toLowerCase();
        if (isLocale(code)) return code;
    }
    return 'en';
}

/** Flatten a dictionary into dotted keys (used by tests and tooling) */
export function flattenKeys(dict: Dictionary, prefix = ''): string[] {
    return Object.entries(dict).flatMap(([key, value]) =>
        typeof value === 'string' ? [`${prefix}${key}`] : flattenKeys(value, `${prefix}${key}.`),
    );
}

/** BCP-47 tag used for Intl date formatting */
export function intlTag(locale: Locale): string {
    return { ja: 'ja-JP', en: 'en-US', zh: 'zh-CN', ko: 'ko-KR', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', pt: 'pt-BR' }[locale];
}
