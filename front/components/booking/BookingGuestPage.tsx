'use client';

/**
 * /booking/[slug]: guests pick an open slot and reserve it (no login).
 * The cancel token is returned once; it is kept in sessionStorage (never in the URL)
 * and the guest continues on /booking/[slug]/done?booking=<uuid>.
 */

import { useState, type FormEvent } from 'react';
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Card,
    CardBody,
    CardHeader,
    Container,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Grid,
    Heading,
    HStack,
    Input,
    SimpleGrid,
    Text,
    Textarea,
    VStack,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Clock, Globe, User as UserIcon } from 'lucide-react';
import api, { ApiError } from '@/lib/api';
import { formatDate, formatDateRange, formatTime } from '@/lib/date';
import { setCancelToken } from '@/lib/hostTokens';
import { useI18n } from '@/providers/I18nProvider';
import type { AvailabilitySlot } from '@/types';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { browserTimezone } from '@/components/account/timezones';
import { apiErrorMessage, fieldErrors } from '@/components/account/utils';
import { groupByDay } from './slotUtils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const publicPageQueryKey = (slug: string) => ['booking-public', slug] as const;

export function BookingGuestPage({ slug }: { slug: string }) {
    const { t } = useI18n();
    const query = useQuery({
        queryKey: publicPageQueryKey(slug),
        queryFn: () => api.getPublicBookingPage(slug),
        retry: false,
    });

    if (query.isPending) return <CenteredSpinner />;
    if (query.error || !query.data) {
        const notFound = query.error instanceof ApiError && query.error.status === 404;
        return (
            <Container maxW="container.sm" py={{ base: 10, md: 16 }} px={4}>
                <VStack spacing={3} textAlign="center" data-testid="booking-unavailable">
                    <Heading as="h1" size="lg">
                        {t(notFound ? 'booking.guest.unavailableTitle' : 'booking.guest.loadErrorTitle')}
                    </Heading>
                    <Text color="text.muted">
                        {notFound ? t('booking.guest.unavailableBody') : apiErrorMessage(query.error, t)}
                    </Text>
                </VStack>
            </Container>
        );
    }

    const page = query.data;
    const slots = page.available_slots.filter((slot) => slot.is_available !== false && !slot.is_booked);

    return (
        <Container maxW="container.xl" py={{ base: 6, md: 10 }} px={4}>
            <VStack spacing={6} align="stretch">
                <VStack align="stretch" spacing={2}>
                    <Heading as="h1" size="lg">
                        {page.title}
                    </Heading>
                    <HStack spacing={4} color="text.muted" fontSize="sm" wrap="wrap">
                        <HStack spacing={1}>
                            <UserIcon size={14} aria-hidden />
                            <Text>{t('booking.guest.organizer', { name: page.organizer })}</Text>
                        </HStack>
                        <HStack spacing={1}>
                            <Clock size={14} aria-hidden />
                            <Text>{t('booking.minutes', { count: page.duration_minutes })}</Text>
                        </HStack>
                        <HStack spacing={1}>
                            <Globe size={14} aria-hidden />
                            <Text>{t('booking.guest.timezone', { timezone: browserTimezone() })}</Text>
                        </HStack>
                    </HStack>
                    {page.description && (
                        <Text whiteSpace="pre-wrap" color="text.muted">
                            {page.description}
                        </Text>
                    )}
                </VStack>
                <ReservationSection slug={slug} slots={slots} onConflict={() => query.refetch()} />
            </VStack>
        </Container>
    );
}

function ReservationSection({ slug, slots, onConflict }: { slug: string; slots: AvailabilitySlot[]; onConflict: () => void }) {
    const { t } = useI18n();
    const router = useRouter();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selected = slots.find((slot) => slot.id === selectedId) ?? null;

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);
        if (!selected) {
            setFormError(t('booking.guest.pickSlot'));
            return;
        }
        const nextErrors: typeof errors = {};
        if (!name.trim()) nextErrors.name = t('booking.guest.errors.name');
        if (!EMAIL_RE.test(email.trim())) nextErrors.email = t('booking.guest.errors.email');
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) return;

        setIsSubmitting(true);
        try {
            const result = await api.reserveSlot(slug, {
                slot: selected.id,
                guest_name: name.trim(),
                guest_email: email.trim(),
                guest_message: message.trim() || undefined,
            });
            setCancelToken(result.booking.uuid, result.cancel_token);
            router.push(`/booking/${encodeURIComponent(slug)}/done?booking=${encodeURIComponent(result.booking.uuid)}`);
        } catch (err) {
            const byField = fieldErrors(err);
            if (byField.slot || (err instanceof ApiError && err.status === 404)) {
                // Someone else was faster: refresh the list and let the guest choose again
                setSelectedId(null);
                setFormError(t('booking.guest.slotTaken'));
                onConflict();
            } else {
                setErrors({ name: byField.guest_name, email: byField.guest_email });
                if (!byField.guest_name && !byField.guest_email) setFormError(apiErrorMessage(err, t));
            }
            setIsSubmitting(false);
        }
    };

    return (
        <Grid templateColumns={{ base: '1fr', lg: '1fr 420px' }} gap={{ base: 6, lg: 8 }} alignItems="start">
            <Card as="section" aria-labelledby="slots-heading">
                <CardHeader pb={0}>
                    <Heading as="h2" size="md" id="slots-heading">
                        {t('booking.guest.pickHeading')}
                    </Heading>
                </CardHeader>
                <CardBody>
                    {slots.length === 0 ? (
                        <Text color="text.muted" textAlign="center" py={8} data-testid="no-slots">
                            {t('booking.guest.noSlots')}
                        </Text>
                    ) : (
                        <VStack align="stretch" spacing={5}>
                            {groupByDay(slots, (slot) => slot.start_at).map((group) => (
                                <Box key={group.dayKey} role="group" aria-labelledby={`day-${group.dayKey}`}>
                                    <Text as="h3" id={`day-${group.dayKey}`} fontWeight="bold" fontSize="sm" mb={2}>
                                        {formatDate(group.date, 'yyyy/MM/dd (E)')}
                                    </Text>
                                    <SimpleGrid columns={{ base: 3, sm: 4, md: 5 }} spacing={2}>
                                        {group.items.map((slot) => {
                                            const isSelected = slot.id === selectedId;
                                            return (
                                                <Button
                                                    key={slot.id}
                                                    size="sm"
                                                    variant={isSelected ? 'solid' : 'outline'}
                                                    aria-pressed={isSelected}
                                                    onClick={() => setSelectedId(isSelected ? null : slot.id)}
                                                    data-testid="guest-slot"
                                                >
                                                    {formatTime(slot.start_at)}
                                                </Button>
                                            );
                                        })}
                                    </SimpleGrid>
                                </Box>
                            ))}
                        </VStack>
                    )}
                </CardBody>
            </Card>

            <Card as="section" aria-labelledby="reserve-heading" position={{ lg: 'sticky' }} top={{ lg: 20 }}>
                <CardHeader pb={0}>
                    <Heading as="h2" size="md" id="reserve-heading">
                        {t('booking.guest.formHeading')}
                    </Heading>
                </CardHeader>
                <CardBody>
                    <VStack as="form" align="stretch" spacing={4} onSubmit={handleSubmit} noValidate>
                        <Box p={3} borderRadius="md" bg={selected ? 'brand.subtle' : 'bg.subtle'} aria-live="polite">
                            <HStack spacing={2}>
                                <CalendarCheck size={16} aria-hidden />
                                <Text fontSize="sm" fontWeight={selected ? 'semibold' : 'normal'} data-testid="selected-slot">
                                    {selected
                                        ? formatDateRange(selected.start_at, selected.end_at)
                                        : t('booking.guest.noSelection')}
                                </Text>
                            </HStack>
                        </Box>
                        {formError && (
                            <Alert status="error" borderRadius="md" fontSize="sm">
                                <AlertIcon />
                                {formError}
                            </Alert>
                        )}
                        <FormControl isRequired isInvalid={!!errors.name}>
                            <FormLabel>{t('booking.guest.name')}</FormLabel>
                            <Input value={name} autoComplete="name" maxLength={100} onChange={(e) => setName(e.target.value)} />
                            <FormErrorMessage>{errors.name}</FormErrorMessage>
                        </FormControl>
                        <FormControl isRequired isInvalid={!!errors.email}>
                            <FormLabel>{t('booking.guest.email')}</FormLabel>
                            <Input type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
                            <FormErrorMessage>{errors.email}</FormErrorMessage>
                        </FormControl>
                        <FormControl>
                            <FormLabel>{t('booking.guest.message')}</FormLabel>
                            <Textarea value={message} rows={3} maxLength={1000} onChange={(e) => setMessage(e.target.value)} />
                        </FormControl>
                        <Button type="submit" size="lg" isLoading={isSubmitting} isDisabled={!selected}>
                            {t('booking.guest.submit')}
                        </Button>
                        <Text fontSize="xs" color="text.muted">
                            {t('booking.guest.privacy')}
                        </Text>
                    </VStack>
                </CardBody>
            </Card>
        </Grid>
    );
}
