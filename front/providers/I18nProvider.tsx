'use client';

/**
 * i18n Provider and Hook
 * RFC-0006: 多言語対応
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type Locale, defaultLocale, getLocaleFromRequest } from '@/lib/i18n';

// Message types
type Messages = Record<string, Record<string, string>>;

interface I18nContextType {
  locale: Locale;
  messages: Messages;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
  initialMessages?: Messages;
}

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
  initialMessages = {},
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [messages, setMessages] = useState<Messages>(initialMessages);

  // Load messages when locale changes
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const msgs = await import(`../messages/${locale}.json`);
        setMessages(msgs.default);
      } catch {
        // Fallback to default
        const msgs = await import(`../messages/${defaultLocale}.json`);
        setMessages(msgs.default);
      }
    };
    loadMessages();
  }, [locale]);

  // Detect locale from browser on mount
  useEffect(() => {
    // Check cookie first
    const cookieMatch = document.cookie.match(/locale=([a-z-]+)/i);
    if (cookieMatch) {
      setLocaleState(cookieMatch[1] as Locale);
      return;
    }
    
    // Check browser language
    const browserLocale = getLocaleFromRequest(navigator.language);
    setLocaleState(browserLocale);
  }, []);

  const setLocale = (newLocale: Locale) => {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    setLocaleState(newLocale);
  };

  /**
   * Translate a key like "auth.login" or "common.submit"
   */
  const t = (key: string): string => {
    const parts = key.split('.');
    if (parts.length === 2) {
      const [namespace, messageKey] = parts;
      return messages[namespace]?.[messageKey] || key;
    }
    // Single level key - cast to string
    return (messages[key] as unknown as string) || key;
  };

  return (
    <I18nContext.Provider value={{ locale, messages, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access i18n context
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

/**
 * Hook for translation function only
 */
export function useTranslation() {
  const { t, locale } = useI18n();
  return { t, locale };
}
