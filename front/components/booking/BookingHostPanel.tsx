'use client';

/**
 * /booking/[slug]/host: management page for the organizer (X-Host-Token).
 *
 * The token comes from this browser (saved when the page was created) or from the
 * management link in the e-mail (?token=...). A token in the URL is moved into
 * localStorage and removed from the address bar right away.
 */

import { useEffect, useState } from 'react';
import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    CardHeader,
    Container,
    Flex,
    FormControl,
    FormHelperText,
    FormLabel,
    Heading,
    HStack,
    Input,
    InputGroup,
    InputRightElement,
    Link as ChakraLink,
    Stack,
    Switch,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Text,
    VStack,
    useToast,
} from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, ExternalLink, Mail, Share2 } from 'lucide-react';
import api, { ApiError } from '@/lib/api';
import { formatDateRange } from '@/lib/date';
import { getDevVerifyUrl, getHostToken, removeHostToken, setHostToken } from '@/lib/hostTokens';
import { useI18n } from '@/providers/I18nProvider';
import type { Booking, HostBookingPage, SlotInput } from '@/types';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { apiErrorMessage } from '@/components/account/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { SlotGenerator } from './SlotGenerator';
import { SlotList } from './SlotList';

export const hostQueryKey = (slug: string) => ['booking-host', slug] as const;

export function BookingHostPanel({ slug }: { slug: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    // undefined = not resolved yet (storage is only readable in the browser)
    const [hostToken, setHostTokenState] = useState<string | null | undefined>(undefined);
    const [justCreated, setJustCreated] = useState(false);

    useEffect(() => {
        const fromUrl = searchParams.get('token');
        const created = searchParams.get('created') === '1';
        if (fromUrl) setHostToken(slug, fromUrl);
        if (created) setJustCreated(true);
        setHostTokenState((prev) => fromUrl || getHostToken(slug) || prev || null);
        if (fromUrl || created) router.replace(`/booking/${encodeURIComponent(slug)}/host`, { scroll: false });
    }, [router, searchParams, slug]);

    const query = useQuery({
        queryKey: hostQueryKey(slug),
        queryFn: () => api.getHostBookingPage(slug, hostToken as string),
        enabled: !!hostToken,
        retry: false,
    });

    // A stale / revoked token is useless: forget it
    const forbidden = query.error instanceof ApiError && query.error.status === 403;
    useEffect(() => {
        if (forbidden) removeHostToken(slug);
    }, [forbidden, slug]);

    let content: React.ReactNode;
    if (hostToken === undefined || (hostToken && query.isPending)) {
        content = <CenteredSpinner />;
    } else if (!hostToken || forbidden) {
        content = (
            <Alert status="warning" borderRadius="md" alignItems="flex-start" data-testid="host-no-token">
                <AlertIcon />
                <Box>
                    <AlertTitle>{t(forbidden ? 'booking.host.invalidToken' : 'booking.host.noToken')}</AlertTitle>
                    <AlertDescription>{t('booking.host.useEmailLink')}</AlertDescription>
                </Box>
            </Alert>
        );
    } else if (query.error || !query.data) {
        content = (
            <Alert status="error" borderRadius="md">
                <AlertIcon />
                {apiErrorMessage(query.error, t)}
            </Alert>
        );
    } else {
        content = <HostDashboard page={query.data} hostToken={hostToken} justCreated={justCreated} />;
    }

    return (
        <Container maxW="container.lg" py={{ base: 6, md: 10 }} px={4}>
            {content}
        </Container>
    );
}

function StatusBadge({ page }: { page: HostBookingPage }) {
    const { t } = useI18n();
    if (page.status === 'PENDING_VERIFY') return <Badge colorScheme="orange">{t('booking.status.pending')}</Badge>;
    if (page.status !== 'PUBLISHED') return <Badge colorScheme="gray">{t('booking.status.unpublished')}</Badge>;
    if (!page.is_active) return <Badge colorScheme="gray">{t('booking.status.paused')}</Badge>;
    return <Badge colorScheme="green">{t('booking.status.published')}</Badge>;
}

function HostDashboard({ page, hostToken, justCreated }: { page: HostBookingPage; hostToken: string; justCreated: boolean }) {
    const { t } = useI18n();
    const activeBookings = page.bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending').length;
    return (
        <VStack spacing={6} align="stretch">
            <VStack align="stretch" spacing={2}>
                <HStack spacing={3} wrap="wrap">
                    <Heading as="h1" size="lg">
                        {page.title}
                    </Heading>
                    <StatusBadge page={page} />
                </HStack>
                <Text color="text.muted" fontSize="sm">
                    {t('booking.host.summary', {
                        organizer: page.organizer_name,
                        minutes: page.duration_minutes,
                        timezone: page.timezone_name,
                    })}
                </Text>
            </VStack>

            {justCreated && page.status !== 'PENDING_VERIFY' && (
                <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    {t('booking.host.created')}
                </Alert>
            )}
            {page.status === 'PENDING_VERIFY' && <VerifyBanner page={page} hostToken={hostToken} />}

            <ShareCard page={page} />
            <SettingsCard page={page} hostToken={hostToken} />

            <Card>
                <Tabs colorScheme="brand" isLazy>
                    <TabList px={4} pt={2} overflowX="auto">
                        <Tab>{t('booking.host.tabs.slots', { count: page.slots.length })}</Tab>
                        <Tab>{t('booking.host.tabs.bookings', { count: activeBookings })}</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel>
                            <SlotsPanel page={page} hostToken={hostToken} />
                        </TabPanel>
                        <TabPanel>
                            <BookingsPanel page={page} hostToken={hostToken} />
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Card>

            <Text fontSize="xs" color="text.muted">
                {t('booking.host.secretNote')}
            </Text>
        </VStack>
    );
}

function VerifyBanner({ page, hostToken }: { page: HostBookingPage; hostToken: string }) {
    const { t } = useI18n();
    const toast = useToast();
    const [isSending, setIsSending] = useState(false);
    const [devVerifyUrl, setDevVerifyUrlState] = useState<string | null>(null);

    useEffect(() => {
        setDevVerifyUrlState(getDevVerifyUrl(page.slug));
    }, [page.slug]);

    const resend = async () => {
        setIsSending(true);
        try {
            await api.resendBookingVerification(page.slug, hostToken);
            toast({ title: t('booking.host.resent', { email: page.organizer_email }), status: 'success', duration: 4000 });
        } catch (err) {
            toast({ title: t('booking.host.resendFailed'), description: apiErrorMessage(err, t), status: 'error', duration: 5000 });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Alert status="warning" borderRadius="md" alignItems="flex-start" data-testid="verify-banner">
            <AlertIcon />
            <VStack align="stretch" spacing={2} flex="1">
                <AlertTitle>{t('booking.host.pendingTitle')}</AlertTitle>
                <AlertDescription>{t('booking.host.pendingBody', { email: page.organizer_email })}</AlertDescription>
                <HStack spacing={3} wrap="wrap">
                    <Button size="sm" variant="outline" leftIcon={<Mail size={14} aria-hidden />} onClick={resend} isLoading={isSending}>
                        {t('booking.host.resend')}
                    </Button>
                    {devVerifyUrl && (
                        <ChakraLink as={NextLink} href={devVerifyUrl} fontSize="sm" color="brand.fg" data-testid="dev-verify-link">
                            {t('booking.host.devVerify')}
                        </ChakraLink>
                    )}
                </HStack>
            </VStack>
        </Alert>
    );
}

function ShareCard({ page }: { page: HostBookingPage }) {
    const { t } = useI18n();
    const toast = useToast();
    const [origin, setOrigin] = useState('');
    const [canShare, setCanShare] = useState(false);

    useEffect(() => {
        setOrigin(window.location.origin);
        setCanShare(typeof navigator.share === 'function');
    }, []);

    const publicPath = page.public_url || `/booking/${page.slug}`;
    const publicUrl = `${origin}${publicPath}`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: t('booking.host.copied'), status: 'success', duration: 2000 });
        } catch {
            toast({ title: t('booking.host.copyFailed'), status: 'error', duration: 3000 });
        }
    };

    const share = async () => {
        try {
            await navigator.share({ title: page.title, url: publicUrl });
        } catch {
            // dismissed by the user
        }
    };

    return (
        <Card as="section" aria-labelledby="share-heading">
            <CardHeader pb={0}>
                <Heading as="h2" size="md" id="share-heading">
                    {t('booking.host.shareHeading')}
                </Heading>
            </CardHeader>
            <CardBody>
                <VStack align="stretch" spacing={3}>
                    <FormControl>
                        <FormLabel fontSize="sm">{t('booking.host.publicUrl')}</FormLabel>
                        <InputGroup>
                            <Input value={publicUrl} isReadOnly pr="3rem" onFocus={(e) => e.target.select()} data-testid="public-url" />
                            <InputRightElement>
                                <Button size="sm" variant="ghost" onClick={copy} aria-label={t('booking.host.copy')} px={2}>
                                    <Copy size={16} />
                                </Button>
                            </InputRightElement>
                        </InputGroup>
                        {page.status !== 'PUBLISHED' && <FormHelperText>{t('booking.host.notPublicYet')}</FormHelperText>}
                    </FormControl>
                    <HStack spacing={3} wrap="wrap">
                        <Button size="sm" leftIcon={<Copy size={14} aria-hidden />} onClick={copy}>
                            {t('booking.host.copy')}
                        </Button>
                        {canShare && (
                            <Button size="sm" variant="outline" leftIcon={<Share2 size={14} aria-hidden />} onClick={share}>
                                {t('booking.host.share')}
                            </Button>
                        )}
                        {page.status === 'PUBLISHED' && (
                            <Button
                                as="a"
                                href={publicPath}
                                target="_blank"
                                rel="noopener"
                                size="sm"
                                variant="ghost"
                                rightIcon={<ExternalLink size={14} aria-hidden />}
                            >
                                {t('booking.host.openPublic')}
                            </Button>
                        )}
                    </HStack>
                </VStack>
            </CardBody>
        </Card>
    );
}

function SettingsCard({ page, hostToken }: { page: HostBookingPage; hostToken: string }) {
    const { t } = useI18n();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState<'is_active' | 'notify_on_booking' | null>(null);

    const toggle = async (field: 'is_active' | 'notify_on_booking', value: boolean) => {
        setSaving(field);
        try {
            const updated = await api.updateHostBookingPage(page.slug, hostToken, { [field]: value });
            queryClient.setQueryData(hostQueryKey(page.slug), updated);
            toast({ title: t('booking.host.saved'), status: 'success', duration: 2000 });
        } catch (err) {
            toast({ title: t('booking.host.saveFailed'), description: apiErrorMessage(err, t), status: 'error', duration: 5000 });
        } finally {
            setSaving(null);
        }
    };

    return (
        <Card as="section" aria-labelledby="settings-heading">
            <CardHeader pb={0}>
                <Heading as="h2" size="md" id="settings-heading">
                    {t('booking.host.settingsHeading')}
                </Heading>
            </CardHeader>
            <CardBody>
                <Stack spacing={4}>
                    <FormControl display="flex" alignItems="flex-start" gap={3}>
                        <Switch
                            id="booking-active"
                            mt={1}
                            isChecked={page.is_active}
                            isDisabled={saving !== null}
                            onChange={(e) => toggle('is_active', e.target.checked)}
                        />
                        <Box>
                            <FormLabel htmlFor="booking-active" mb={0}>
                                {t('booking.host.accepting')}
                            </FormLabel>
                            <FormHelperText mt={0}>{t('booking.host.acceptingHelp')}</FormHelperText>
                        </Box>
                    </FormControl>
                    <FormControl display="flex" alignItems="flex-start" gap={3}>
                        <Switch
                            id="booking-notify"
                            mt={1}
                            isChecked={page.notify_on_booking}
                            isDisabled={saving !== null}
                            onChange={(e) => toggle('notify_on_booking', e.target.checked)}
                        />
                        <Box>
                            <FormLabel htmlFor="booking-notify" mb={0}>
                                {t('booking.host.notify')}
                            </FormLabel>
                            <FormHelperText mt={0}>{t('booking.host.notifyHelp', { email: page.organizer_email })}</FormHelperText>
                        </Box>
                    </FormControl>
                </Stack>
            </CardBody>
        </Card>
    );
}

function SlotsPanel({ page, hostToken }: { page: HostBookingPage; hostToken: string }) {
    const { t } = useI18n();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [removingKey, setRemovingKey] = useState<string | null>(null);
    const refresh = () => queryClient.invalidateQueries({ queryKey: hostQueryKey(page.slug) });

    const add = async (slots: SlotInput[]) => {
        setIsAdding(true);
        try {
            const result = await api.addHostSlots(page.slug, hostToken, slots);
            const skipped = result.errors?.length ?? 0;
            toast({
                title: t('booking.host.slotsAdded', { count: result.created?.length ?? 0 }),
                description: skipped ? t('booking.host.slotsSkipped', { count: skipped }) : undefined,
                status: skipped ? 'warning' : 'success',
                duration: 4000,
            });
        } catch (err) {
            // 400 when none could be added (e.g. all duplicates / in the past)
            toast({ title: t('booking.host.slotsAddFailed'), description: apiErrorMessage(err, t), status: 'error', duration: 5000 });
        } finally {
            setIsAdding(false);
            await refresh();
        }
    };

    const remove = async (key: string) => {
        setRemovingKey(key);
        try {
            await api.deleteHostSlot(page.slug, hostToken, Number(key));
            await refresh();
        } catch (err) {
            toast({ title: t('booking.host.slotDeleteFailed'), description: apiErrorMessage(err, t), status: 'error', duration: 5000 });
        } finally {
            setRemovingKey(null);
        }
    };

    return (
        <Flex gap={8} direction={{ base: 'column', md: 'row' }}>
            <Box flex="1" minW={0}>
                <Heading as="h3" size="sm" mb={3}>
                    {t('booking.host.addSlots')}
                </Heading>
                <SlotGenerator durationMinutes={page.duration_minutes} onGenerate={add} isAdding={isAdding} />
            </Box>
            <Box flex="1" minW={0}>
                <Heading as="h3" size="sm" mb={3}>
                    {t('booking.host.currentSlots')}
                </Heading>
                <SlotList
                    slots={page.slots.map((slot) => ({
                        key: String(slot.id),
                        start_at: slot.start_at,
                        end_at: slot.end_at,
                        booked: slot.is_booked,
                    }))}
                    onRemove={remove}
                    removingKey={removingKey}
                />
            </Box>
        </Flex>
    );
}

const BOOKING_STATUS_COLORS: Record<string, string> = {
    pending: 'orange',
    confirmed: 'green',
    cancelled: 'gray',
    completed: 'blue',
};

function BookingsPanel({ page, hostToken }: { page: HostBookingPage; hostToken: string }) {
    const { t } = useI18n();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [target, setTarget] = useState<Booking | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    const cancel = async () => {
        if (!target) return;
        setIsCancelling(true);
        try {
            await api.hostCancelBooking(page.slug, hostToken, target.uuid);
            toast({ title: t('booking.host.bookingCancelled'), status: 'success', duration: 3000 });
            setTarget(null);
            await queryClient.invalidateQueries({ queryKey: hostQueryKey(page.slug) });
        } catch (err) {
            toast({ title: t('booking.host.cancelFailed'), description: apiErrorMessage(err, t), status: 'error', duration: 5000 });
        } finally {
            setIsCancelling(false);
        }
    };

    if (page.bookings.length === 0) {
        return (
            <Text color="text.muted" textAlign="center" py={8} data-testid="bookings-empty">
                {t('booking.host.noBookings')}
            </Text>
        );
    }

    const sorted = [...page.bookings].sort(
        (a, b) => new Date(a.slot_info?.start_at ?? a.created_at).getTime() - new Date(b.slot_info?.start_at ?? b.created_at).getTime()
    );

    return (
        <>
            <VStack as="ul" spacing={3} align="stretch" listStyleType="none" m={0}>
                {sorted.map((booking) => {
                    const cancellable = booking.status === 'confirmed' || booking.status === 'pending';
                    return (
                        <Box
                            as="li"
                            key={booking.uuid}
                            p={4}
                            borderRadius="lg"
                            border="1px solid"
                            borderColor="border.default"
                            opacity={cancellable ? 1 : 0.7}
                            data-testid="host-booking"
                        >
                            <Flex justify="space-between" gap={3} wrap="wrap">
                                <VStack align="stretch" spacing={1} minW={0}>
                                    <HStack spacing={2} wrap="wrap">
                                        <Text fontWeight="bold">
                                            {booking.slot_info ? formatDateRange(booking.slot_info.start_at, booking.slot_info.end_at) : '-'}
                                        </Text>
                                        <Badge colorScheme={BOOKING_STATUS_COLORS[booking.status] ?? 'gray'}>
                                            {t(`booking.bookingStatus.${booking.status}`)}
                                        </Badge>
                                    </HStack>
                                    <Text fontSize="sm">
                                        {booking.guest_name}{' '}
                                        <ChakraLink href={`mailto:${booking.guest_email}`} color="brand.fg">
                                            {booking.guest_email}
                                        </ChakraLink>
                                    </Text>
                                    {booking.guest_message && (
                                        <Text fontSize="sm" color="text.muted" whiteSpace="pre-wrap">
                                            {booking.guest_message}
                                        </Text>
                                    )}
                                </VStack>
                                {cancellable && (
                                    <Button size="sm" variant="outline" colorScheme="red" onClick={() => setTarget(booking)}>
                                        {t('booking.host.cancelBooking')}
                                    </Button>
                                )}
                            </Flex>
                        </Box>
                    );
                })}
            </VStack>
            <ConfirmDialog
                isOpen={!!target}
                title={t('booking.host.cancelConfirmTitle')}
                body={t('booking.host.cancelConfirmBody', { name: target?.guest_name ?? '' })}
                confirmLabel={t('booking.host.cancelBooking')}
                onConfirm={cancel}
                onClose={() => setTarget(null)}
                isLoading={isCancelling}
            />
        </>
    );
}
