'use client';

/**
 * Interactive header menus (theme / account / mobile drawer).
 *
 * Loaded lazily by Header.tsx after hydration: Chakra's Menu / Drawer (popper, focus-lock,
 * modal) are sizeable and not needed for the first paint of any page.
 */

import {
    Avatar,
    Button,
    Divider,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    HStack,
    IconButton,
    Menu,
    MenuButton,
    MenuDivider,
    MenuItem,
    MenuItemOption,
    MenuList,
    MenuOptionGroup,
    Text,
    VStack,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { CalendarClock, LogOut, Plug, Plus, User as UserIcon } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { siteConfig } from '@/lib/site';
import { useI18n } from '@/providers/I18nProvider';
import { themeIcons, useThemeStore, type ThemeMode } from '@/stores/themeStore';

const THEME_OPTIONS: ThemeMode[] = ['light', 'dark', 'cute'];

export function ThemeMenu() {
    const { t } = useI18n();
    const mode = useThemeStore((state) => state.mode);
    const setMode = useThemeStore((state) => state.setMode);

    return (
        <Menu>
            <MenuButton
                as={IconButton}
                aria-label={t('header.theme')}
                icon={
                    <Text as="span" fontSize="lg" aria-hidden>
                        {mode ? themeIcons[mode] : '🌓'}
                    </Text>
                }
                variant="ghost"
                colorScheme="gray"
                size="sm"
            />
            <MenuList minW="160px" zIndex={200}>
                <MenuOptionGroup
                    type="radio"
                    value={mode ?? 'system'}
                    onChange={(value) => setMode(value === 'system' ? null : (value as ThemeMode))}
                >
                    <MenuItemOption value="system">🌓 {t('header.themeSystem')}</MenuItemOption>
                    {THEME_OPTIONS.map((option) => (
                        <MenuItemOption key={option} value={option}>
                            {themeIcons[option]} {t(`header.theme_${option}`)}
                        </MenuItemOption>
                    ))}
                </MenuOptionGroup>
            </MenuList>
        </Menu>
    );
}

export function AccountMenu({ displayName, onLogout }: { displayName: string; onLogout: () => void }) {
    const { t } = useI18n();
    return (
        <Menu>
            <MenuButton as={Button} variant="ghost" colorScheme="gray" size="sm" aria-label={t('header.accountMenu')}>
                <HStack spacing={2}>
                    <Avatar size="xs" name={displayName} />
                    <Text as="span" display={{ base: 'none', lg: 'inline' }} maxW="140px" noOfLines={1}>
                        {displayName}
                    </Text>
                </HStack>
            </MenuButton>
            <MenuList zIndex={200}>
                <MenuItem as={NextLink} href="/account" icon={<UserIcon size={16} />}>
                    {t('header.account')}
                </MenuItem>
                <MenuItem as={NextLink} href="/account/events" icon={<CalendarClock size={16} />}>
                    {t('header.myEvents')}
                </MenuItem>
                <MenuItem as={NextLink} href="/account/integrations" icon={<Plug size={16} />}>
                    {t('header.integrations')}
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={<LogOut size={16} />} onClick={onLogout}>
                    {t('header.logout')}
                </MenuItem>
            </MenuList>
        </Menu>
    );
}

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    signedIn: boolean;
    displayName: string;
    onLogout: () => void;
}

export function MobileDrawer({ isOpen, onClose, signedIn, displayName, onLogout }: MobileDrawerProps) {
    const { t } = useI18n();
    return (
        <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
            <DrawerOverlay />
            <DrawerContent>
                <DrawerCloseButton aria-label={t('common.close')} />
                <DrawerHeader borderBottomWidth="1px">{siteConfig.name}</DrawerHeader>
                <DrawerBody>
                    <VStack as="nav" spacing={2} align="stretch" pt={2} aria-label={t('header.mainNav')}>
                        <Button as={NextLink} href="/create" onClick={onClose} leftIcon={<Plus size={18} />}>
                            {t('header.create')}
                        </Button>
                        <Button as={NextLink} href="/booking/new" variant="outline" onClick={onClose}>
                            {t('header.oneOnOne')}
                        </Button>
                        <Button as={NextLink} href="/faq" variant="ghost" colorScheme="gray" justifyContent="flex-start" onClick={onClose}>
                            {t('header.faq')}
                        </Button>
                        <Divider />
                        {signedIn ? (
                            <>
                                <HStack spacing={3} px={2} py={1}>
                                    <Avatar size="sm" name={displayName} />
                                    <Text fontWeight="bold" noOfLines={1}>
                                        {displayName}
                                    </Text>
                                </HStack>
                                <Button as={NextLink} href="/account" variant="ghost" colorScheme="gray" justifyContent="flex-start" leftIcon={<UserIcon size={18} />} onClick={onClose}>
                                    {t('header.account')}
                                </Button>
                                <Button as={NextLink} href="/account/events" variant="ghost" colorScheme="gray" justifyContent="flex-start" leftIcon={<CalendarClock size={18} />} onClick={onClose}>
                                    {t('header.myEvents')}
                                </Button>
                                <Button as={NextLink} href="/account/integrations" variant="ghost" colorScheme="gray" justifyContent="flex-start" leftIcon={<Plug size={18} />} onClick={onClose}>
                                    {t('header.integrations')}
                                </Button>
                                <Button variant="ghost" colorScheme="red" justifyContent="flex-start" leftIcon={<LogOut size={18} />} onClick={onLogout}>
                                    {t('header.logout')}
                                </Button>
                            </>
                        ) : (
                            <Button as={NextLink} href="/login" variant="outline" onClick={onClose}>
                                {t('header.login')}
                            </Button>
                        )}
                        <Divider />
                        <HStack justify="space-between">
                            <LanguageSwitcher />
                            <ThemeMenu />
                        </HStack>
                    </VStack>
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
}
