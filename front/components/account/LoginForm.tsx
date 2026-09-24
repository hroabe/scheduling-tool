'use client';

/**
 * Login (docs/11_integration.md §2.5): e-mail address or username + password (session + CSRF).
 * The SSO button is shown only when Keycloak is configured. `?next=` is respected after login.
 */

import { useEffect, useState, type FormEvent } from 'react';
import {
    Alert,
    AlertIcon,
    Button,
    Divider,
    FormControl,
    FormLabel,
    HStack,
    Input,
    Link as ChakraLink,
    Text,
    VStack,
    useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { isLocale } from '@/lib/i18n';
import { isKeycloakEnabled } from '@/lib/keycloak';
import { useI18n } from '@/providers/I18nProvider';
import { useAuthStore } from '@/stores/authStore';
import { AuthCard } from './AuthCard';
import { apiErrorMessage, safeNextPath } from './utils';

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const toast = useToast();
    const { t, locale, setLocale } = useI18n();
    const login = useAuthStore((state) => state.login);
    const loginWithKeycloak = useAuthStore((state) => state.loginWithKeycloak);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isChecked = useAuthStore((state) => state.isChecked);

    const next = safeNextPath(searchParams.get('next'));
    const [identifier, setIdentifier] = useState(searchParams.get('email') ?? '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Already signed in (e.g. opened /login from a bookmark): go straight to the destination
    useEffect(() => {
        if (isChecked && isAuthenticated && !isSubmitting) router.replace(next);
    }, [isChecked, isAuthenticated, isSubmitting, next, router]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        if (!identifier.trim() || !password) {
            setError(t('auth.login.required'));
            return;
        }
        setIsSubmitting(true);
        try {
            const user = await login(identifier.trim(), password);
            const preferred = user.profile?.preferred_language;
            if (isLocale(preferred) && preferred !== locale) setLocale(preferred);
            toast({ title: t('auth.login.success'), status: 'success', duration: 3000 });
            router.replace(next);
        } catch (err) {
            if (err instanceof ApiError && (err.status === 400 || err.status === 401 || err.status === 403)) {
                setError(t('auth.login.invalid'));
            } else {
                setError(apiErrorMessage(err, t));
            }
            setIsSubmitting(false);
        }
    };

    const handleSso = async () => {
        setIsRedirecting(true);
        try {
            await loginWithKeycloak(next);
        } catch {
            setIsRedirecting(false);
            setError(t('auth.login.ssoFailed'));
        }
    };

    const registerHref = `/register${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`;

    return (
        <AuthCard title={t('auth.login.title')} description={t('auth.login.description')}>
            {error && (
                <Alert status="error" borderRadius="md" data-testid="login-error">
                    <AlertIcon />
                    {error}
                </Alert>
            )}

            {isKeycloakEnabled && (
                <>
                    <Button
                        variant="outline"
                        size="lg"
                        leftIcon={<KeyRound size={18} aria-hidden />}
                        onClick={handleSso}
                        isLoading={isRedirecting}
                    >
                        {t('auth.login.sso')}
                    </Button>
                    <HStack>
                        <Divider />
                        <Text color="text.muted" fontSize="sm" whiteSpace="nowrap">
                            {t('auth.login.or')}
                        </Text>
                        <Divider />
                    </HStack>
                </>
            )}

            <VStack as="form" spacing={4} align="stretch" onSubmit={handleSubmit} noValidate>
                <FormControl isRequired>
                    <FormLabel>{t('auth.login.identifier')}</FormLabel>
                    <Input
                        name="username"
                        autoComplete="username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        size="lg"
                    />
                </FormControl>
                <FormControl isRequired>
                    <FormLabel>{t('auth.login.password')}</FormLabel>
                    <Input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        size="lg"
                    />
                </FormControl>
                <Button type="submit" size="lg" isLoading={isSubmitting}>
                    {t('auth.login.submit')}
                </Button>
            </VStack>

            <Divider />
            <Text fontSize="sm" color="text.muted" textAlign="center">
                {t('auth.login.noAccount')}{' '}
                <ChakraLink as={NextLink} href={registerHref} color="brand.fg" fontWeight="semibold">
                    {t('auth.login.register')}
                </ChakraLink>
            </Text>
        </AuthCard>
    );
}
