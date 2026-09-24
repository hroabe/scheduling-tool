'use client';

/**
 * OIDC callback (RFC-0011): validates `state` and exchanges the code via the auth store,
 * then returns to the page that started the login.
 */

import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertIcon, Button, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/providers/I18nProvider';
import { useAuthStore } from '@/stores/authStore';
import { AuthCard } from './AuthCard';
import { CenteredSpinner } from './CenteredSpinner';
import { safeNextPath } from './utils';

type CallbackError = 'denied' | 'missingCode' | 'invalidState' | 'failed';

export function KeycloakCallback() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    const completeKeycloakLogin = useAuthStore((state) => state.completeKeycloakLogin);
    const [error, setError] = useState<CallbackError | null>(null);
    // The authorization code is single-use: never exchange it twice (React strict mode)
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        if (searchParams.get('error')) {
            setError('denied');
            return;
        }
        if (!code) {
            setError('missingCode');
            return;
        }
        completeKeycloakLogin(code, state)
            .then((returnTo) => router.replace(safeNextPath(returnTo)))
            .catch((err: unknown) => {
                setError(err instanceof Error && err.message === 'invalid_state' ? 'invalidState' : 'failed');
            });
    }, [completeKeycloakLogin, router, searchParams]);

    if (!error) return <CenteredSpinner label={t('auth.callback.processing')} />;

    return (
        <AuthCard title={t('auth.callback.errorTitle')}>
            <VStack spacing={4} align="stretch">
                <Alert status="error" borderRadius="md" alignItems="flex-start">
                    <AlertIcon />
                    <AlertDescription>{t(`auth.callback.${error}`)}</AlertDescription>
                </Alert>
                <Button as={NextLink} href="/login">
                    {t('auth.callback.retry')}
                </Button>
            </VStack>
        </AuthCard>
    );
}
