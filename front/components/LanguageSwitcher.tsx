'use client';

/**
 * Language Switcher Component
 * RFC-0006: 多言語対応
 */

import { Button, Menu, MenuButton, MenuItemOption, MenuList, MenuOptionGroup } from '@chakra-ui/react';
import { Globe } from 'lucide-react';
import { localeNames, locales, type Locale } from '@/lib/i18n';
import { useI18n } from '@/providers/I18nProvider';

export default function LanguageSwitcher({ size = 'sm', w }: { size?: 'sm' | 'md'; w?: string }) {
    const { locale, setLocale, t } = useI18n();

    return (
        <Menu>
            <MenuButton
                as={Button}
                variant="ghost"
                colorScheme="gray"
                size={size}
                w={w}
                leftIcon={<Globe size={16} aria-hidden />}
                aria-label={`${t('header.language')}: ${localeNames[locale]}`}
            >
                {localeNames[locale]}
            </MenuButton>
            <MenuList zIndex={200}>
                <MenuOptionGroup type="radio" value={locale} onChange={(value) => setLocale(value as Locale)}>
                    {locales.map((code) => (
                        <MenuItemOption key={code} value={code} lang={code}>
                            {localeNames[code]}
                        </MenuItemOption>
                    ))}
                </MenuOptionGroup>
            </MenuList>
        </Menu>
    );
}
