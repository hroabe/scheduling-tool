'use client';

/**
 * Guest-facing pages that show one reservation:
 * - /booking/[slug]/done?booking=<uuid>   right after reserving
 * - /booking/cancel?booking=<uuid>&token= the cancellation link from the confirmation e-mail
 *
 * A cancel token that arrives in the URL is moved to sessionStorage and removed from the
 * address bar; the done page reads the token saved when the reservation was made.
 */

import { useEffect, useState } from 'react';
import { Alert, AlertIcon, Button, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarCheck, CalendarX } from 'lucide-react';
import api from '@/lib/api';
import { getCancelToken, setCancelToken } from '@/lib/hostTokens';
import { useI18n } from '@/providers/I18nProvider';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { apiErrorMessage } from '@/components/account/utils';
import { BookingSummary, CancelBookingButton, bookingQueryKey } from './BookingSummary';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads ?booking= (or legacy ?rid=) and the cancel token, stripping the token from the URL */
function useBookingParams(basePath: string) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const raw = searchParams.get('booking') || searchParams.get('rid') || '';
    const bookingUuid = UUID_RE.test(raw) ? raw : null;
    // undefined = not read yet (storage is browser-only)
    const [cancelToken, setToken] = useState<string | null | undefined>(undefined);

    useEffect(() => {
        if (!bookingUuid) {
            setToken(null);
            return;
        }
        const fromUrl = searchParams.get('token');
        if (fromUrl) {
            setCancelToken(bookingUuid, fromUrl);
            router.replace(`${basePath}?booking=${encodeURIComponent(bookingUuid)}`, { scroll: false });
        }
        // Keep the token already read even if storage is unavailable after the URL is cleaned
        setToken((prev) => fromUrl || getCancelToken(bookingUuid) || prev || null);
    }, [basePath, bookingUuid, router, searchParams]);

    return { bookingUuid, cancelToken };
}

function useBooking(uuid: string | null, cancelToken: string | null | undefined) {
    return useQuery({
        queryKey: bookingQueryKey(uuid ?? ''),
        // The cancel token proves ownership; without it the API omits the guest's e-mail/message
        queryFn: () => api.getBooking(uuid as string, cancelToken ?? undefined),
        enabled: !!uuid && cancelToken !== undefined,
        retry: false,
    });
}

export function BookingDone({ slug }: { slug: string }) {
    const { t } = useI18n();
    const basePath = `/booking/${encodeURIComponent(slug)}/done`;
    const { bookingUuid, cancelToken } = useBookingParams(basePath);
    const { data: booking, error, isPending } = useBooking(bookingUuid, cancelToken);

    if (!bookingUuid) return <InvalidLink />;
    if (isPending) return <CenteredSpinner />;
    if (error || !booking) return <LoadError message={apiErrorMessage(error, t)} />;

    const cancelled = booking.status === 'cancelled';

    return (
        <Container maxW="container.sm" py={{ base: 8, md: 12 }} px={4}>
            <VStack spacing={6} align="stretch">
                <VStack spacing={3} textAlign="center">
                    <Heading as="h1" size="lg">
                        <HStack as="span" justify="center" spacing={2}>
                            {cancelled ? <CalendarX aria-hidden /> : <CalendarCheck aria-hidden />}
                            <span>{t(cancelled ? 'booking.done.cancelledTitle' : 'booking.done.title')}</span>
                        </HStack>
                    </Heading>
                    {!cancelled && <Text color="text.muted">{t('booking.done.emailSent', { email: booking.guest_email })}</Text>}
                </VStack>
                <BookingSummary booking={booking} />
                <HStack spacing={3} justify="center" wrap="wrap">
                    {!cancelled && cancelToken && <CancelBookingButton booking={booking} cancelToken={cancelToken} />}
                    <Button as={NextLink} href={`/booking/${encodeURIComponent(slug)}`} variant="ghost">
                        {t('booking.done.backToPage')}
                    </Button>
                </HStack>
                {!cancelled && !cancelToken && cancelToken !== undefined && (
                    <Text fontSize="sm" color="text.muted" textAlign="center">
                        {t('booking.done.cancelViaEmail')}
                    </Text>
                )}
            </VStack>
        </Container>
    );
}

export function BookingCancel() {
    const { t } = useI18n();
    const { bookingUuid, cancelToken } = useBookingParams('/booking/cancel');
    const { data: booking, error, isPending } = useBooking(bookingUuid, cancelToken);

    if (!bookingUuid || cancelToken === null) return <InvalidLink />;
    if (isPending || cancelToken === undefined) return <CenteredSpinner />;
    if (error || !booking) return <LoadError message={apiErrorMessage(error, t)} />;

    const cancelled = booking.status === 'cancelled';
    const cancellable = booking.status === 'confirmed' || booking.status === 'pending';

    return (
        <Container maxW="container.sm" py={{ base: 8, md: 12 }} px={4}>
            <VStack spacing={6} align="stretch">
                <VStack spacing={2} textAlign="center">
                    <Heading as="h1" size="lg">
                        {t('booking.cancel.title')}
                    </Heading>
                    <Text color="text.muted">
                        {t(cancelled ? 'booking.cancel.alreadyCancelled' : cancellable ? 'booking.cancel.description' : 'booking.cancel.notCancellable')}
                    </Text>
                </VStack>
                <BookingSummary booking={booking} />
                {cancellable && (
                    <HStack justify="center">
                        <CancelBookingButton booking={booking} cancelToken={cancelToken} />
                    </HStack>
                )}
            </VStack>
        </Container>
    );
}

function InvalidLink() {
    const { t } = useI18n();
    return (
        <Container maxW="container.sm" py={{ base: 10, md: 16 }} px={4}>
            <VStack spacing={3} textAlign="center" data-testid="invalid-link">
                <Heading as="h1" size="lg">
                    {t('booking.invalidLink.title')}
                </Heading>
                <Text color="text.muted">{t('booking.invalidLink.body')}</Text>
            </VStack>
        </Container>
    );
}

function LoadError({ message }: { message: string }) {
    const { t } = useI18n();
    return (
        <Container maxW="container.sm" py={{ base: 10, md: 16 }} px={4}>
            <VStack spacing={4} align="stretch">
                <Heading as="h1" size="lg" textAlign="center">
                    {t('booking.loadErrorTitle')}
                </Heading>
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {message}
                </Alert>
            </VStack>
        </Container>
    );
}
