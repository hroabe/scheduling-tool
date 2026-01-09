'use client';

import {
    Box,
    Flex,
    Container,
    HStack,
    Button,
    IconButton,
    useColorModeValue,
    Heading,
    Link as ChakraLink,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Avatar,
    Text,
    Tooltip,
    useDisclosure,
    Drawer,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    DrawerHeader,
    DrawerBody,
    VStack,
    Divider,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Github, Calendar, LogOut, User as UserIcon, Menu as MenuIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, themeIcons, themeLabels, type ThemeMode } from '@/stores/themeStore';
import { useEffect } from 'react';
import { useI18n } from '@/providers/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export function Header() {
    const router = useRouter();
    const { user, logout, checkAuth, isAuthenticated } = useAuthStore();
    const { mode, setMode, cycleMode } = useThemeStore();
    const { t, locale, setLocale } = useI18n();
    const { isOpen, onOpen, onClose } = useDisclosure();
    
    const bg = useColorModeValue('whiteAlpha.900', 'blackAlpha.700');
    const borderColor = useColorModeValue('gray.200', 'gray.700');

    // Initial auth check
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
        onClose();
    };

    const handleNavClick = () => {
        onClose();
    };

    return (
        <Box
            as="header"
            position="sticky"
            top={0}
            zIndex={100}
            bg={mode === 'cute' ? 'rgba(255, 240, 245, 0.95)' : bg}
            backdropFilter="blur(10px)"
            borderBottom="1px solid"
            borderColor={mode === 'cute' ? 'brand.200' : borderColor}
        >
            <Container maxW="container.xl">
                <Flex h={16} align="center" justify="space-between">
                    {/* Logo */}
                    <Link href="/" passHref>
                        <HStack spacing={2} cursor="pointer">
                            <Box
                                p={2}
                                borderRadius={mode === 'cute' ? 'full' : 'lg'}
                                bg="brand.500"
                                color="white"
                            >
                                <Calendar size={20} />
                            </Box>
                            <Heading size="md" fontWeight="bold" display={{ base: 'none', sm: 'block' }}>
                                {t('schedule.title')}
                            </Heading>
                            {mode === 'cute' && (
                                <Text fontSize="lg" ml={1} display={{ base: 'none', sm: 'block' }}>✨</Text>
                            )}
                        </HStack>
                    </Link>

                    {/* Desktop Navigation */}
                    <HStack spacing={4} display={{ base: 'none', md: 'flex' }}>
                        {/* Nav Links */}
                        <HStack spacing={1}>
                            <Button
                                as="a"
                                href="#features"
                                variant="ghost"
                                size="sm"
                                fontWeight="normal"
                            >
                                {t('header.features')}
                            </Button>
                            <Button
                                as="a"
                                href="#steps"
                                variant="ghost"
                                size="sm"
                                fontWeight="normal"
                            >
                                {t('header.howToUse')}
                            </Button>
                            <Button
                                as="a"
                                href="#faq"
                                variant="ghost"
                                size="sm"
                                fontWeight="normal"
                            >
                                FAQ
                            </Button>
                        </HStack>

                        {/* Language Switcher */}
                        <LanguageSwitcher
                            currentLocale={locale}
                            onLocaleChange={setLocale}
                        />

                        <Button
                            as={Link}
                            href="/create"
                            variant="outline"
                            colorScheme="brand"
                            size="sm"
                        >
                            {t('home.primaryCta')}
                        </Button>

                        {isAuthenticated ? (
                            <Menu>
                                <MenuButton
                                    as={Button}
                                    variant="ghost"
                                    rounded="full"
                                    cursor="pointer"
                                    minW={0}
                                >
                                    <HStack>
                                        <Avatar size="sm" name={user?.username || 'User'} />
                                        <Text display={{ base: 'none', lg: 'block' }}>
                                            {user?.username}
                                        </Text>
                                    </HStack>
                                </MenuButton>
                                <MenuList>
                                    <MenuItem icon={<UserIcon size={16} />} as={Link} href="/account">
                                        {t('schedule.myEvents')}
                                    </MenuItem>
                                    <MenuItem icon={<Calendar size={16} />} as={Link} href="/oneonone">
                                        {t('booking.title')}
                                    </MenuItem>
                                    <MenuItem icon={<LogOut size={16} />} onClick={handleLogout}>
                                        {t('auth.logout')}
                                    </MenuItem>
                                </MenuList>
                            </Menu>
                        ) : (
                            <>
                                <Button
                                    as={Link}
                                    href="/login"
                                    variant="ghost"
                                    size="sm"
                                >
                                    {t('auth.login')}
                                </Button>
                                <Button
                                    as={Link}
                                    href="/login"
                                    variant="outline"
                                    size="sm"
                                >
                                    {t('auth.signup')}
                                </Button>
                            </>
                        )}

                        {/* Theme Toggle Menu */}
                        <Menu>
                            <MenuButton
                                as={IconButton}
                                aria-label="テーマ切り替え"
                                icon={<Text fontSize="lg">{themeIcons[mode]}</Text>}
                                variant="ghost"
                                size="sm"
                            />
                            <MenuList minW="120px">
                                {(['light', 'dark', 'cute'] as ThemeMode[]).map((themeOption) => (
                                    <MenuItem
                                        key={themeOption}
                                        onClick={() => setMode(themeOption)}
                                        fontWeight={mode === themeOption ? 'bold' : 'normal'}
                                        bg={mode === themeOption ? 'brand.50' : undefined}
                                    >
                                        <HStack>
                                            <Text>{themeIcons[themeOption]}</Text>
                                            <Text>{themeLabels[themeOption]}</Text>
                                        </HStack>
                                    </MenuItem>
                                ))}
                            </MenuList>
                        </Menu>

                        <ChakraLink
                            href="https://github.com"
                            isExternal
                            _hover={{ color: 'brand.500' }}
                        >
                            <IconButton
                                aria-label="GitHub"
                                icon={<Github size={18} />}
                                variant="ghost"
                                size="sm"
                            />
                        </ChakraLink>
                    </HStack>

                    {/* Mobile Menu Button */}
                    <IconButton
                        aria-label="メニューを開く"
                        icon={<MenuIcon size={24} />}
                        variant="ghost"
                        display={{ base: 'flex', md: 'none' }}
                        onClick={onOpen}
                    />
                </Flex>
            </Container>

            {/* Mobile Drawer */}
            <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerCloseButton />
                    <DrawerHeader borderBottomWidth="1px">
                        {t('schedule.title')}
                    </DrawerHeader>

                    <DrawerBody>
                        <VStack spacing={4} align="stretch" pt={4}>
                            <Button
                                as={Link}
                                href="/create"
                                colorScheme="brand"
                                size="lg"
                                onClick={handleNavClick}
                            >
                                {t('schedule.create')}
                            </Button>

                            <Divider />

                            {isAuthenticated ? (
                                <>
                                    <HStack spacing={3} p={2}>
                                        <Avatar size="sm" name={user?.username || 'User'} />
                                        <Text fontWeight="bold">{user?.username}</Text>
                                    </HStack>
                                    <Button
                                        as={Link}
                                        href="/account"
                                        variant="ghost"
                                        justifyContent="flex-start"
                                        leftIcon={<UserIcon size={18} />}
                                        onClick={handleNavClick}
                                    >
                                        {t('schedule.myEvents')}
                                    </Button>
                                    <Button
                                        as={Link}
                                        href="/oneonone"
                                        variant="ghost"
                                        justifyContent="flex-start"
                                        leftIcon={<Calendar size={18} />}
                                        onClick={handleNavClick}
                                    >
                                        {t('booking.title')}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        justifyContent="flex-start"
                                        leftIcon={<LogOut size={18} />}
                                        onClick={handleLogout}
                                        color="red.500"
                                    >
                                        {t('auth.logout')}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        as={Link}
                                        href="/login"
                                        variant="outline"
                                        size="lg"
                                        onClick={handleNavClick}
                                    >
                                        {t('auth.login')}
                                    </Button>
                                    <Button
                                        as={Link}
                                        href="/login"
                                        variant="solid"
                                        colorScheme="brand"
                                        size="lg"
                                        onClick={handleNavClick}
                                    >
                                        {t('auth.signup')}
                                    </Button>
                                </>
                            )}

                            <Divider />

                            {/* Theme Selection */}
                            <Text fontWeight="bold" fontSize="sm" color="gray.500">テーマ</Text>
                            <HStack spacing={2}>
                                {(['light', 'dark', 'cute'] as ThemeMode[]).map((themeOption) => (
                                    <Button
                                        key={themeOption}
                                        size="sm"
                                        variant={mode === themeOption ? 'solid' : 'outline'}
                                        onClick={() => setMode(themeOption)}
                                    >
                                        {themeIcons[themeOption]}
                                    </Button>
                                ))}
                            </HStack>

                            {/* Language */}
                            <Text fontWeight="bold" fontSize="sm" color="gray.500">言語</Text>
                            <LanguageSwitcher
                                currentLocale={locale}
                                onLocaleChange={setLocale}
                            />
                        </VStack>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </Box>
    );
}



