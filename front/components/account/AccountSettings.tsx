'use client';

/**
 * /account: profile, display/notification preferences and password change.
 * Visitors are redirected to /login?next=/account (no duplicate login UI here).
 */

import { useMemo, useState, type FormEvent } from 'react';
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Card,
    CardBody,
    CardHeader,
    Container,
    Flex,
    FormControl,
    FormErrorMessage,
    FormHelperText,
    FormLabel,
    Heading,
    Input,
    LinkBox,
    LinkOverlay,
    Select,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    VStack,
    useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { CalendarClock, ChevronRight, LogOut, Plug } from 'lucide-react';
import { isLocale, localeNames, locales, type Locale } from '@/lib/i18n';
import { useI18n } from '@/providers/I18nProvider';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';
import api from '@/lib/api';
import { AccountNav } from './AccountNav';
import { RequireAuth } from './RequireAuth';
import { listTimezones } from './timezones';
import { apiErrorMessage, fieldErrors } from './utils';

export function AccountSettings() {
    const { t } = useI18n();
    return (
        <Container maxW="container.md" py={{ base: 6, md: 10 }} px={4}>
            <VStack spacing={6} align="stretch">
                <Heading as="h1" size="lg">
                    {t('account.title')}
                </Heading>
                <AccountNav />
                <RequireAuth>
                    {(user) => (
                        <>
                            <ProfileCard key={user.id} user={user} />
                            <PasswordCard />
                            <AccountLinks />
                            <LogoutButton />
                        </>
                    )}
                </RequireAuth>
            </VStack>
        </Container>
    );
}

function ProfileCard({ user }: { user: User }) {
    const { t, locale, setLocale } = useI18n();
    const toast = useToast();
    const updateProfile = useAuthStore((state) => state.updateProfile);

    const initialLanguage = isLocale(user.profile?.preferred_language) ? user.profile.preferred_language : locale;
    const [form, setForm] = useState({
        last_name: user.last_name ?? '',
        first_name: user.first_name ?? '',
        email: user.email ?? '',
        timezone_name: user.profile?.timezone_name || 'Asia/Tokyo',
        email_notifications: user.profile?.email_notifications ?? true,
        preferred_language: initialLanguage as Locale,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const timezones = useMemo(() => listTimezones(form.timezone_name), [form.timezone_name]);

    const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setErrors({});
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            setErrors({ email: t('account.profile.invalidEmail') });
            return;
        }
        setIsSaving(true);
        try {
            await updateProfile({ ...form, email: form.email.trim() });
            if (form.preferred_language !== locale) setLocale(form.preferred_language);
            toast({ title: t('account.profile.saved'), status: 'success', duration: 3000 });
        } catch (err) {
            const byField = fieldErrors(err);
            setErrors(byField);
            toast({
                title: t('account.profile.saveFailed'),
                description: Object.keys(byField).length ? undefined : apiErrorMessage(err, t),
                status: 'error',
                duration: 5000,
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card as="section" aria-labelledby="profile-heading">
            <CardHeader pb={0}>
                <Heading as="h2" size="md" id="profile-heading">
                    {t('account.profile.heading')}
                </Heading>
                <Text color="text.muted" fontSize="sm" mt={1}>
                    {t('account.profile.username', { username: user.username })}
                </Text>
            </CardHeader>
            <CardBody>
                <VStack as="form" spacing={4} align="stretch" onSubmit={handleSubmit} noValidate>
                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                        <FormControl>
                            <FormLabel>{t('account.profile.lastName')}</FormLabel>
                            <Input
                                autoComplete="family-name"
                                value={form.last_name}
                                onChange={(e) => update('last_name', e.target.value)}
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>{t('account.profile.firstName')}</FormLabel>
                            <Input
                                autoComplete="given-name"
                                value={form.first_name}
                                onChange={(e) => update('first_name', e.target.value)}
                            />
                        </FormControl>
                    </SimpleGrid>
                    <FormControl isInvalid={!!errors.email}>
                        <FormLabel>{t('account.profile.email')}</FormLabel>
                        <Input
                            type="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={(e) => update('email', e.target.value)}
                        />
                        <FormErrorMessage>{errors.email}</FormErrorMessage>
                    </FormControl>

                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                        <FormControl>
                            <FormLabel>{t('settings.language')}</FormLabel>
                            <Select
                                value={form.preferred_language}
                                onChange={(e) => {
                                    if (isLocale(e.target.value)) update('preferred_language', e.target.value);
                                }}
                            >
                                {locales.map((code) => (
                                    <option key={code} value={code}>
                                        {localeNames[code]}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl isInvalid={!!errors.timezone_name}>
                            <FormLabel>{t('settings.timezone')}</FormLabel>
                            <Select value={form.timezone_name} onChange={(e) => update('timezone_name', e.target.value)}>
                                {timezones.map((zone) => (
                                    <option key={zone} value={zone}>
                                        {zone}
                                    </option>
                                ))}
                            </Select>
                            <FormErrorMessage>{errors.timezone_name}</FormErrorMessage>
                        </FormControl>
                    </SimpleGrid>

                    <FormControl display="flex" alignItems="flex-start" gap={3}>
                        <Switch
                            id="email-notifications"
                            mt={1}
                            isChecked={form.email_notifications}
                            onChange={(e) => update('email_notifications', e.target.checked)}
                        />
                        <Box>
                            <FormLabel htmlFor="email-notifications" mb={0}>
                                {t('settings.emailNotifications')}
                            </FormLabel>
                            <FormHelperText mt={0}>{t('settings.emailNotificationsHelp')}</FormHelperText>
                        </Box>
                    </FormControl>

                    <Flex justify="flex-end">
                        <Button type="submit" isLoading={isSaving}>
                            {t('account.profile.save')}
                        </Button>
                    </Flex>
                </VStack>
            </CardBody>
        </Card>
    );
}

const EMPTY_PASSWORDS = { old_password: '', new_password: '', new_password_confirm: '' };

function PasswordCard() {
    const { t } = useI18n();
    const toast = useToast();
    // Accounts signed in through Keycloak (SSO) have no usable local password
    const isSso = useAuthStore((state) => Boolean(state.tokens.accessToken));
    const [form, setForm] = useState(EMPTY_PASSWORDS);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setErrors({});
        setFormError(null);
        if (!form.old_password || !form.new_password) {
            setFormError(t('account.password.required'));
            return;
        }
        if (form.new_password !== form.new_password_confirm) {
            setErrors({ new_password_confirm: t('account.password.mismatch') });
            return;
        }
        setIsSaving(true);
        try {
            await api.changePassword(form);
            setForm(EMPTY_PASSWORDS);
            toast({ title: t('account.password.changed'), status: 'success', duration: 3000 });
        } catch (err) {
            const byField = fieldErrors(err);
            setErrors(byField);
            if (Object.keys(byField).length === 0) setFormError(apiErrorMessage(err, t));
        } finally {
            setIsSaving(false);
        }
    };

    const input = (name: keyof typeof EMPTY_PASSWORDS, autoComplete: string) => (
        <FormControl isInvalid={!!errors[name]} isRequired>
            <FormLabel>{t(`account.password.${name}`)}</FormLabel>
            <Input
                type="password"
                name={name}
                autoComplete={autoComplete}
                value={form[name]}
                onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
            />
            <FormErrorMessage>{errors[name]}</FormErrorMessage>
        </FormControl>
    );

    return (
        <Card as="section" aria-labelledby="password-heading">
            <CardHeader pb={0}>
                <Heading as="h2" size="md" id="password-heading">
                    {t('account.password.heading')}
                </Heading>
            </CardHeader>
            <CardBody>
                {isSso ? (
                    <Text color="text.muted" fontSize="sm">
                        {t('account.password.sso')}
                    </Text>
                ) : (
                    <VStack as="form" spacing={4} align="stretch" onSubmit={handleSubmit} noValidate>
                        {formError && (
                            <Alert status="error" borderRadius="md">
                                <AlertIcon />
                                {formError}
                            </Alert>
                        )}
                        {input('old_password', 'current-password')}
                        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                            {input('new_password', 'new-password')}
                            {input('new_password_confirm', 'new-password')}
                        </SimpleGrid>
                        <Flex justify="flex-end">
                            <Button type="submit" variant="outline" isLoading={isSaving}>
                                {t('account.password.submit')}
                            </Button>
                        </Flex>
                    </VStack>
                )}
            </CardBody>
        </Card>
    );
}

function AccountLinks() {
    const { t } = useI18n();
    const links = [
        { href: '/account/events', icon: CalendarClock, key: 'events' },
        { href: '/account/integrations', icon: Plug, key: 'integrations' },
    ] as const;
    return (
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            {links.map(({ href, icon: Icon, key }) => (
                <LinkBox key={href} as={Card} _hover={{ borderColor: 'brand.fg' }} transition="border-color 0.15s">
                    <CardBody>
                        <Flex align="center" gap={3}>
                            <Box color="brand.fg" aria-hidden>
                                <Icon size={24} />
                            </Box>
                            <Stack spacing={0} flex="1">
                                <LinkOverlay as={NextLink} href={href} fontWeight="semibold">
                                    {t(`account.nav.${key}`)}
                                </LinkOverlay>
                                <Text color="text.muted" fontSize="sm">
                                    {t(`account.links.${key}`)}
                                </Text>
                            </Stack>
                            <ChevronRight size={18} aria-hidden />
                        </Flex>
                    </CardBody>
                </LinkBox>
            ))}
        </SimpleGrid>
    );
}

function LogoutButton() {
    const { t } = useI18n();
    const toast = useToast();
    const logout = useAuthStore((state) => state.logout);
    const isLoading = useAuthStore((state) => state.isLoading);
    // Once signed out, RequireAuth sends the visitor to the login page
    const handleLogout = async () => {
        await logout();
        toast({ title: t('auth.logoutSuccess'), status: 'info', duration: 3000 });
    };
    return (
        <Flex justify="center">
            <Button variant="ghost" colorScheme="red" leftIcon={<LogOut size={16} aria-hidden />} onClick={handleLogout} isLoading={isLoading}>
                {t('auth.logout')}
            </Button>
        </Flex>
    );
}
