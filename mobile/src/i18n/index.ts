/**
 * i18n - Internationalization for React Native
 * RFC-0006: 多言語対応
 */

import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ja from './locales/ja.json';
import en from './locales/en.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';

// Supported locales
export type SupportedLocale = 'ja' | 'en' | 'zh' | 'ko' | 'es' | 'fr' | 'de' | 'pt';

const supportedLocales: SupportedLocale[] = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'de', 'pt'];

// Create i18n instance
const i18n = new I18n({
  ja,
  en,
  zh,
  ko,
  es,
  fr,
  de,
  pt,
});

// Set default locale
i18n.defaultLocale = 'ja';
i18n.enableFallback = true;

// Initialize with device locale
export const initI18n = async () => {
  try {
    // Check saved locale
    const savedLocale = await AsyncStorage.getItem('locale');
    if (savedLocale && supportedLocales.includes(savedLocale as SupportedLocale)) {
      i18n.locale = savedLocale;
      return;
    }

    // Use device locale
    const deviceLocale = Localization.locale.split('-')[0] as SupportedLocale;
    if (supportedLocales.includes(deviceLocale)) {
      i18n.locale = deviceLocale;
    } else {
      i18n.locale = 'en'; // Fallback for unsupported languages
    }
  } catch {
    i18n.locale = 'ja';
  }
};

// Change locale
export const setLocale = async (locale: SupportedLocale) => {
  i18n.locale = locale;
  await AsyncStorage.setItem('locale', locale);
};

// Get current locale
export const getLocale = () => i18n.locale as SupportedLocale;

// Get all supported locales
export const getSupportedLocales = () => supportedLocales;

// Translation function
export const t = (key: string, options?: object) => {
  return i18n.t(key, options);
};

// Hook for components
export const useTranslation = () => {
  return {
    t: (key: string, options?: object) => i18n.t(key, options),
    locale: i18n.locale as SupportedLocale,
    setLocale,
    supportedLocales,
  };
};

export default i18n;

