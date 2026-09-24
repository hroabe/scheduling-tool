'use client';

import { Box, Button, Container, Flex, HStack, IconButton, Link as ChakraLink, Text, useColorModeValue } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Calendar, Globe, Menu as MenuIcon, Plus } from 'lucide-react';
import { siteConfig } from '@/lib/site';
import { useI18n } from '@/providers/I18nProvider';
import { useAuthStore } from '@/stores/authStore';

// Menus and the mobile drawer (Chakra Menu / Drawer) are loaded after hydration so they
// never block the first paint; the placeholders keep the same size (no layout shift).
function MenuPlaceholder({ w }: { w: string }) {
    return <Box w={w} h="32px" aria-hidden />;
}
const LanguageSwitcher = dynamic(() => import('@/components/LanguageSwitcher'), {
    ssr: false,
    loading: () => (
        <Button variant="ghost" colorScheme="gray" size="sm" leftIcon={<Globe size={16} aria-hidden />} isDisabled>
            &nbsp;
        </Button>
    ),
});
const ThemeMenu = dynamic(() => import('./HeaderMenus').then((m) => m.ThemeMenu), {
    ssr: false,
    loading: () => <MenuPlaceholder w="32px" />,
});
const AccountMenu = dynamic(() => import('./HeaderMenus').then((m) => m.AccountMenu), {
    ssr: false,
    loading: () => <MenuPlaceholder w="48px" />,
});
const MobileDrawer = dynamic(() => import('./HeaderMenus').then((m) => m.MobileDrawer), { ssr: false });

export function Header() {
    const router = useRouter();
    const { t } = useI18n();
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const logout = useAuthStore((state) => state.logout);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerRequested, setDrawerRequested] = useState(false);
    const bg = useColorModeValue('rgba(255, 255, 255, 0.9)', 'rgba(26, 32, 44, 0.85)');

    // Auth state is restored on the client; keep the server markup identical
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const signedIn = mounted && isAuthenticated;
    const displayName = user ? [user.last_name, user.first_name].filter(Boolean).join(' ') || user.username : '';

    const handleLogout = async () => {
        setDrawerOpen(false);
        await logout();
        router.push('/');
    };

    const openDrawer = () => {
        setDrawerRequested(true);
        setDrawerOpen(true);
    };

    return (
        <Box
            as="header"
            position="sticky"
            top={0}
            zIndex={100}
            bg={bg}
            backdropFilter="saturate(180%) blur(10px)"
            borderBottom="1px solid"
            borderColor="border.default"
            className="no-print"
        >
            <ChakraLink
                href="#main"
                position="absolute"
                left="-9999px"
                _focus={{ left: 2, top: 2, zIndex: 200, bg: 'bg.card', p: 2, borderRadius: 'md' }}
            >
                {t('header.skipToContent')}
            </ChakraLink>
            <Container maxW="container.xl">
                <Flex h={16} align="center" justify="space-between" gap={2}>
                    <ChakraLink
                        as={NextLink}
                        href="/"
                        _hover={{ textDecoration: 'none' }}
                        aria-label={t('header.home', { name: siteConfig.name })}
                    >
                        <HStack spacing={2}>
                            <Box p={2} borderRadius="lg" bg="brand.500" color="white" aria-hidden>
                                <Calendar size={20} />
                            </Box>
                            <Text as="span" fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold" whiteSpace="nowrap">
                                {siteConfig.name}
                            </Text>
                        </HStack>
                    </ChakraLink>

                    {/* Desktop navigation */}
                    <HStack as="nav" spacing={1} display={{ base: 'none', md: 'flex' }} aria-label={t('header.mainNav')}>
                        <Button as={NextLink} href="/booking/new" variant="ghost" colorScheme="gray" size="sm">
                            {t('header.oneOnOne')}
                        </Button>
                        <Button as={NextLink} href="/faq" variant="ghost" colorScheme="gray" size="sm">
                            {t('header.faq')}
                        </Button>
                        <LanguageSwitcher />
                        <ThemeMenu />
                        {signedIn ? (
                            <AccountMenu displayName={displayName} onLogout={handleLogout} />
                        ) : (
                            <Button as={NextLink} href="/login" variant="ghost" colorScheme="gray" size="sm">
                                {t('header.login')}
                            </Button>
                        )}
                        <Button as={NextLink} href="/create" size="sm" leftIcon={<Plus size={16} />}>
                            {t('header.create')}
                        </Button>
                    </HStack>

                    {/* Mobile */}
                    <HStack spacing={1} display={{ base: 'flex', md: 'none' }}>
                        <Button as={NextLink} href="/create" size="sm" leftIcon={<Plus size={16} />}>
                            {t('header.create')}
                        </Button>
                        <IconButton
                            aria-label={t('header.openMenu')}
                            icon={<MenuIcon size={22} />}
                            variant="ghost"
                            colorScheme="gray"
                            onClick={openDrawer}
                        />
                    </HStack>
                </Flex>
            </Container>

            {drawerRequested && (
                <MobileDrawer
                    isOpen={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    signedIn={signedIn}
                    displayName={displayName}
                    onLogout={handleLogout}
                />
            )}
        </Box>
    );
}
