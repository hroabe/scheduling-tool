'use client';

import { Button, HStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarClock, Plug, User as UserIcon } from 'lucide-react';
import { useI18n } from '@/providers/I18nProvider';

const ITEMS = [
    { href: '/account', key: 'profile', icon: UserIcon },
    { href: '/account/events', key: 'events', icon: CalendarClock },
    { href: '/account/integrations', key: 'integrations', icon: Plug },
] as const;

/** Section navigation shared by the /account pages */
export function AccountNav() {
    const pathname = usePathname();
    const { t } = useI18n();
    return (
        <HStack as="nav" aria-label={t('account.nav.label')} spacing={2} overflowX="auto" pb={1}>
            {ITEMS.map(({ href, key, icon: Icon }) => {
                const active = pathname === href;
                return (
                    <Button
                        key={href}
                        as={NextLink}
                        href={href}
                        size="sm"
                        variant={active ? 'solid' : 'ghost'}
                        colorScheme={active ? 'brand' : 'gray'}
                        leftIcon={<Icon size={16} aria-hidden />}
                        aria-current={active ? 'page' : undefined}
                        flexShrink={0}
                    >
                        {t(`account.nav.${key}`)}
                    </Button>
                );
            })}
        </HStack>
    );
}
