'use client';

/**
 * /booking/verify?slug=&token=: e-mail verification link. Publishes the booking page
 * (idempotent: opening the link twice still succeeds).
 */

import { useEffect, useRef, useState } from 'react';
import { Button, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import api, { ApiError } from '@/lib/api';
import { getHostToken, removeDevVerifyUrl } from '@/lib/hostTokens';
import { useI18n } from '@/providers/I18nProvider';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { apiErrorMessage } from '@/components/account/utils';

type State =
    | { kind: 'loading' }
    | { kind: 'success'; slug: string; hasHostToken: boolean }
    | { kind: 'error'; message: string };

export function BookingVerify() {
    const { t } = useI18n();
    const searchParams = useSearchParams();
    const slug = searchParams.get('slug');
    const token = searchParams.get('token');
    const [state, setState] = useState<State>({ kind: 'loading' });
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        if (!slug || !token) {
            setState({ kind: 'error', message: t('booking.verify.invalid') });
            return;
        }
        api.verifyBookingPage(slug, token)
            .then(() => {
                removeDevVerifyUrl(slug);
                setState({ kind: 'success', slug, hasHostToken: !!getHostToken(slug) });
            })
            .catch((err: unknown) => {
                const invalid = err instanceof ApiError && (err.status === 403 || err.status === 404 || err.status === 400);
                setState({ kind: 'error', message: invalid ? t('booking.verify.invalid') : apiErrorMessage(err, t) });
            });
    }, [slug, token, t]);

    if (state.kind === 'loading') return <CenteredSpinner label={t('booking.verify.loading')} />;

    const success = state.kind === 'success';
    return (
        <Container maxW="container.sm" py={{ base: 10, md: 16 }} px={4}>
            <VStack spacing={4} textAlign="center" data-testid={success ? 'verify-success' : 'verify-error'}>
                <Heading as="h1" size="lg">
                    <HStack as="span" justify="center" spacing={2}>
                        {success ? <CheckCircle2 aria-hidden /> : <XCircle aria-hidden />}
                        <span>{t(success ? 'booking.verify.successTitle' : 'booking.verify.errorTitle')}</span>
                    </HStack>
                </Heading>
                {state.kind === 'success' ? (
                    <>
                        <Text color="text.muted">{t('booking.verify.successBody')}</Text>
                        {!state.hasHostToken && <Text color="text.muted">{t('booking.verify.linkInEmail')}</Text>}
                        <HStack spacing={3} wrap="wrap" justify="center">
                            {state.hasHostToken && (
                                <Button as={NextLink} href={`/booking/${encodeURIComponent(state.slug)}/host`}>
                                    {t('booking.verify.openHost')}
                                </Button>
                            )}
                            <Button
                                as={NextLink}
                                href={`/booking/${encodeURIComponent(state.slug)}`}
                                variant={state.hasHostToken ? 'outline' : 'solid'}
                            >
                                {t('booking.verify.openPublic')}
                            </Button>
                        </HStack>
                    </>
                ) : (
                    <>
                        <Text color="text.muted">{state.message}</Text>
                        <Button as={NextLink} href="/booking/new" variant="outline">
                            {t('booking.verify.createNew')}
                        </Button>
                    </>
                )}
            </VStack>
        </Container>
    );
}
