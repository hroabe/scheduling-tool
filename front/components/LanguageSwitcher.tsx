'use client';

/**
 * Language Switcher Component
 * RFC-0006: 多言語対応
 */

import { useState } from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Icon,
} from '@chakra-ui/react';
import { locales, localeNames, supportedLocales, type Locale } from '@/lib/i18n';

interface LanguageSwitcherProps {
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export default function LanguageSwitcher({
  currentLocale,
  onLocaleChange,
}: LanguageSwitcherProps) {
  const handleChange = (locale: Locale) => {
    // Set cookie for persistence
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
    onLocaleChange(locale);
  };

  return (
    <Menu>
      <MenuButton
        as={Button}
        variant="ghost"
        size="sm"
        rightIcon={
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4H2z" />
          </svg>
        }
      >
        🌐 {localeNames[currentLocale]}
      </MenuButton>
      <MenuList>
        {supportedLocales.map((locale) => (
          <MenuItem
            key={locale}
            onClick={() => handleChange(locale)}
            fontWeight={locale === currentLocale ? 'bold' : 'normal'}
          >
            {localeNames[locale]}
            {locale === currentLocale && ' ✓'}
          </MenuItem>
        ))}
        {/* Show other locales as coming soon */}
        {locales.filter(l => !supportedLocales.includes(l)).length > 0 && (
          <>
            <MenuItem isDisabled fontSize="sm" color="gray.500">
              ──── Coming Soon ────
            </MenuItem>
            {locales.filter(l => !supportedLocales.includes(l)).map((locale) => (
              <MenuItem
                key={locale}
                isDisabled
                color="gray.400"
              >
                {localeNames[locale]}
              </MenuItem>
            ))}
          </>
        )}
      </MenuList>
    </Menu>
  );
}
