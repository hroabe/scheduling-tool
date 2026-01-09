/**
 * i18n Configuration
 * RFC-0006: 多言語対応
 */

export const locales = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'de', 'pt'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ja';

export const localeNames: Record<Locale, string> = {
  'ja': '日本語',
  'en': 'English',
  'zh': '中文（简体）',
  'ko': '한국어',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'pt': 'Português',
};

// All languages are now fully supported
export const supportedLocales: Locale[] = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'de', 'pt'];

/**
 * Get locale from Accept-Language header or cookie
 */
export function getLocaleFromRequest(acceptLanguage?: string, cookie?: string): Locale {
  // First check cookie
  if (cookie) {
    const match = cookie.match(/locale=([a-z-]+)/i);
    if (match && locales.includes(match[1] as Locale)) {
      return match[1] as Locale;
    }
  }

  // Then check Accept-Language header
  if (acceptLanguage) {
    const languages = acceptLanguage.split(',').map(lang => {
      const [code] = lang.trim().split(';');
      return code.toLowerCase();
    });

    for (const lang of languages) {
      // Exact match
      if (locales.includes(lang as Locale)) {
        return lang as Locale;
      }
      // Base language match (e.g., 'zh-CN' -> 'zh')
      const base = lang.split('-')[0];
      if (locales.includes(base as Locale)) {
        return base as Locale;
      }
    }
  }

  return defaultLocale;
}

/**
 * Load messages for a locale
 */
export async function getMessages(locale: Locale) {
  try {
    return (await import(`../messages/${locale}.json`)).default;
  } catch {
    // Fallback to default locale
    return (await import(`../messages/${defaultLocale}.json`)).default;
  }
}

