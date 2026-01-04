/**
 * i18n - Internationalization for React Native
 * RFC-0006: 多言語対応
 */

import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ja from './locales/ja.json';
import en from './locales/en.json';

// Create i18n instance
const i18n = new I18n({
  ja,
  en,
});

// Set default locale
i18n.defaultLocale = 'ja';
i18n.enableFallback = true;

// Initialize with device locale
export const initI18n = async () => {
  try {
    // Check saved locale
    const savedLocale = await AsyncStorage.getItem('locale');
    if (savedLocale) {
      i18n.locale = savedLocale;
      return;
    }

    // Use device locale
    const deviceLocale = Localization.locale.split('-')[0];
    if (deviceLocale === 'ja' || deviceLocale === 'en') {
      i18n.locale = deviceLocale;
    } else {
      i18n.locale = 'en'; // Fallback for non-Japanese non-English devices
    }
  } catch {
    i18n.locale = 'ja';
  }
};

// Change locale
export const setLocale = async (locale: 'ja' | 'en') => {
  i18n.locale = locale;
  await AsyncStorage.setItem('locale', locale);
};

// Get current locale
export const getLocale = () => i18n.locale;

// Translation function
export const t = (key: string, options?: object) => {
  return i18n.t(key, options);
};

// Hook for components
export const useTranslation = () => {
  return {
    t: (key: string, options?: object) => i18n.t(key, options),
    locale: i18n.locale,
    setLocale,
  };
};

export default i18n;
