'use client';

/**
 * /booking/new: create a login-free 1-on-1 booking page (docs/11_integration.md §2.7).
 * The host token returned once by the API is kept in this browser (lib/hostTokens) and
 * the organizer continues on the management page, which asks them to verify their e-mail.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
    Alert,
    AlertIcon,
    Badge,
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
    Grid,
    Heading,
    Input,
    Select,
    Text,
    VStack,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import api from '@/lib/api';
import { setDevVerifyUrl, setHostToken } from '@/lib/hostTokens';
import { useI18n } from '@/providers/I18nProvider';
import { useAuthStore } from '@/stores/authStore';
import type { SlotInput } from '@/types';
import { browserTimezone, listTimezones } from '@/components/account/timezones';
import { apiErrorMessage, fieldErrors } from '@/components/account/utils';
import { SlotGenerator } from './SlotGenerator';
import { SlotList } from './SlotList';
import { DURATION_OPTIONS, MAX_CREATE_SLOTS, mergeSlots } from './slotUtils';

type Field = 'title' | 'organizer_name' | 'organizer_email' | 'slots';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BookingCreateForm() {
    const router = useRouter();
    const { t } = useI18n();
    const user = useAuthStore((state) => state.user);

    const [title, setTitle] = useState('');
    const [organizerName, setOrganizerName] = useState('');
    const [organizerEmail, setOrganizerEmail] = useState('');
    const [duration, setDuration] = useState(30);
    const [timezone, setTimezone] = useState('Asia/Tokyo');
    const [slots, setSlots] = useState<SlotInput[]>([]);
    const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const timezones = useMemo(() => listTimezones(timezone), [timezone]);

    // Browser-only defaults (the server render always uses Asia/Tokyo / empty fields)
    useEffect(() => {
        setTimezone(browserTimezone());
    }, []);
    useEffect(() => {
        if (!user) return;
        const fullName = [user.last_name, user.first_name].filter(Boolean).join(' ');
        setOrganizerName((prev) => prev || fullName || user.username);
        setOrganizerEmail((prev) => prev || user.email);
    }, [user]);

    const handleGenerate = (generated: SlotInput[]) => {
        const merged = mergeSlots(slots, generated);
        if (merged.length > MAX_CREATE_SLOTS) {
            setNotice(t('booking.new.slotLimit', { max: MAX_CREATE_SLOTS }));
            setSlots(merged.slice(0, MAX_CREATE_SLOTS));
        } else {
            setNotice(null);
            setSlots(merged);
        }
        setErrors((prev) => ({ ...prev, slots: undefined }));
    };

    const validate = (): boolean => {
        const next: Partial<Record<Field, string>> = {};
        if (!title.trim()) next.title = t('booking.new.errors.title');
        if (!organizerName.trim()) next.organizer_name = t('booking.new.errors.organizerName');
        if (!EMAIL_RE.test(organizerEmail.trim())) next.organizer_email = t('booking.new.errors.organizerEmail');
        if (slots.length === 0) next.slots = t('booking.new.errors.slots');
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);
        if (!validate()) return;
        // Slots generated a while ago may have started in the meantime
        const now = Date.now();
        const upcoming = slots.filter((slot) => new Date(slot.start_at).getTime() > now);
        if (upcoming.length === 0) {
            setSlots([]);
            setErrors({ slots: t('booking.new.errors.slots') });
            return;
        }
        setIsSubmitting(true);
        try {
            const created = await api.createBookingPage({
                title: title.trim(),
                organizer_name: organizerName.trim(),
                organizer_email: organizerEmail.trim(),
                duration_minutes: duration,
                timezone_name: timezone,
                slots: upcoming,
            });
            setHostToken(created.slug, created.host_token);
            if (created.verify_url) setDevVerifyUrl(created.slug, created.verify_url);
            router.push(`/booking/${encodeURIComponent(created.slug)}/host?created=1`);
        } catch (err) {
            const byField = fieldErrors(err);
            setErrors({
                title: byField.title,
                organizer_name: byField.organizer_name,
                organizer_email: byField.organizer_email,
                slots: byField.slots,
            });
            if (!Object.values(byField).some(Boolean)) setFormError(apiErrorMessage(err, t));
            setIsSubmitting(false);
        }
    };

    return (
        <Container maxW="container.xl" py={{ base: 6, md: 10 }} px={4}>
            <VStack as="form" spacing={6} align="stretch" onSubmit={handleSubmit} noValidate>
                <VStack align="stretch" spacing={1}>
                    <Heading as="h1" size="lg">
                        {t('booking.new.title')}
                    </Heading>
                    <Text color="text.muted">{t('booking.new.description')}</Text>
                </VStack>

                <Grid templateColumns={{ base: '1fr', lg: '1fr 420px' }} gap={{ base: 6, lg: 8 }} alignItems="start">
                    <VStack spacing={6} align="stretch">
                        <Card as="section" aria-labelledby="booking-basics">
                            <CardHeader pb={0}>
                                <Heading as="h2" size="md" id="booking-basics">
                                    {t('booking.new.basics')}
                                </Heading>
                            </CardHeader>
                            <CardBody>
                                <VStack spacing={4} align="stretch">
                                    <FormControl isRequired isInvalid={!!errors.title}>
                                        <FormLabel>{t('booking.new.fields.title')}</FormLabel>
                                        <Input
                                            value={title}
                                            maxLength={200}
                                            placeholder={t('booking.new.fields.titlePlaceholder')}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                        <FormErrorMessage>{errors.title}</FormErrorMessage>
                                    </FormControl>
                                    <FormControl isRequired isInvalid={!!errors.organizer_name}>
                                        <FormLabel>{t('booking.new.fields.organizerName')}</FormLabel>
                                        <Input
                                            value={organizerName}
                                            maxLength={100}
                                            autoComplete="name"
                                            onChange={(e) => setOrganizerName(e.target.value)}
                                        />
                                        <FormErrorMessage>{errors.organizer_name}</FormErrorMessage>
                                    </FormControl>
                                    <FormControl isRequired isInvalid={!!errors.organizer_email}>
                                        <FormLabel>{t('booking.new.fields.organizerEmail')}</FormLabel>
                                        <Input
                                            type="email"
                                            value={organizerEmail}
                                            autoComplete="email"
                                            onChange={(e) => setOrganizerEmail(e.target.value)}
                                        />
                                        {errors.organizer_email ? (
                                            <FormErrorMessage>{errors.organizer_email}</FormErrorMessage>
                                        ) : (
                                            <FormHelperText>{t('booking.new.fields.organizerEmailHelp')}</FormHelperText>
                                        )}
                                    </FormControl>
                                    <Flex gap={4} direction={{ base: 'column', sm: 'row' }}>
                                        <FormControl>
                                            <FormLabel>{t('booking.new.fields.duration')}</FormLabel>
                                            <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                                                {DURATION_OPTIONS.map((minutes) => (
                                                    <option key={minutes} value={minutes}>
                                                        {t('booking.minutes', { count: minutes })}
                                                    </option>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <FormControl>
                                            <FormLabel>{t('booking.new.fields.timezone')}</FormLabel>
                                            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                                                {timezones.map((zone) => (
                                                    <option key={zone} value={zone}>
                                                        {zone}
                                                    </option>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Flex>
                                </VStack>
                            </CardBody>
                        </Card>

                        <Card as="section" aria-labelledby="booking-generator">
                            <CardHeader pb={0}>
                                <Heading as="h2" size="md" id="booking-generator">
                                    {t('booking.new.availability')}
                                </Heading>
                            </CardHeader>
                            <CardBody>
                                <SlotGenerator durationMinutes={duration} onGenerate={handleGenerate} />
                            </CardBody>
                        </Card>
                    </VStack>

                    <VStack spacing={4} align="stretch" position={{ lg: 'sticky' }} top={{ lg: 20 }}>
                        <Card as="section" aria-labelledby="booking-slots">
                            <CardHeader pb={0}>
                                <Flex justify="space-between" align="center">
                                    <Heading as="h2" size="md" id="booking-slots">
                                        {t('booking.new.slotsHeading')}
                                    </Heading>
                                    <Badge colorScheme={slots.length ? 'brand' : 'gray'} data-testid="slot-count">
                                        {t('booking.new.slotCount', { count: slots.length, max: MAX_CREATE_SLOTS })}
                                    </Badge>
                                </Flex>
                            </CardHeader>
                            <CardBody>
                                <VStack align="stretch" spacing={3}>
                                    {notice && (
                                        <Alert status="warning" borderRadius="md" fontSize="sm">
                                            <AlertIcon />
                                            {notice}
                                        </Alert>
                                    )}
                                    <SlotList
                                        slots={slots.map((slot) => ({ ...slot, key: slot.start_at }))}
                                        onRemove={(key) => setSlots((prev) => prev.filter((slot) => slot.start_at !== key))}
                                    />
                                    {errors.slots && (
                                        <Text color="red.500" fontSize="sm" role="alert">
                                            {errors.slots}
                                        </Text>
                                    )}
                                    {slots.length > 0 && (
                                        <Button size="xs" variant="ghost" alignSelf="flex-end" onClick={() => setSlots([])}>
                                            {t('booking.new.clearSlots')}
                                        </Button>
                                    )}
                                </VStack>
                            </CardBody>
                        </Card>

                        {formError && (
                            <Alert status="error" borderRadius="md">
                                <AlertIcon />
                                {formError}
                            </Alert>
                        )}
                        <Button
                            type="submit"
                            size="lg"
                            leftIcon={<Send size={18} aria-hidden />}
                            isLoading={isSubmitting}
                            data-testid="create-booking-submit"
                        >
                            {t('booking.new.submit')}
                        </Button>
                        <Text fontSize="xs" color="text.muted" textAlign="center">
                            {t('booking.new.verifyNote')}
                        </Text>
                    </VStack>
                </Grid>
            </VStack>
        </Container>
    );
}
