/**
 * Guest reservation on a public 1-on-1 page (login-free API, RFC-0005 v2).
 * Reached from deep links: schedulingtool://booking/<slug>, https://<host>/booking/<slug>.
 * The cancel token returned by `reserve` is kept in secure storage so the guest can cancel later.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { api, ApiError, type AvailabilitySlot, type Booking, type PublicBookingPage } from '../api';
import { BOOKING_TONE } from '../components/BookingCard';
import { Badge, Body, Button, Card, Choice, EmptyState, ErrorBanner, InfoBanner, Loading, Screen, SectionTitle, TextField, Title } from '../components/ui';
import { useI18n } from '../i18n';
import { formatDate, formatRange, formatTime, toDateInput } from '../lib/date';
import { confirmAsync, errorMessage, notify } from '../lib/dialogs';
import type { RootScreenProps } from '../navigation/types';
import { getCancelToken, getReservations, rememberReservation } from '../stores/localEvents';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BookingScreen({ route, navigation }: RootScreenProps<'Booking'>) {
    const { slug } = route.params;
    const { t, locale } = useI18n();
    const [page, setPage] = useState<PublicBookingPage | null>(null);
    const [loadError, setLoadError] = useState<{ message: string; notFound: boolean } | null>(null);
    const [mine, setMine] = useState<Booking[]>([]);
    const [day, setDay] = useState<string | null>(null);
    const [slotId, setSlotId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState<Booking | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await api.getPublicBookingPage(slug);
            setPage(data);
            setLoadError(null);
            navigation.setOptions({ title: data.title });
        } catch (e) {
            setLoadError({
                message: errorMessage(e, t('common.genericError'), t('common.networkError')),
                notFound: e instanceof ApiError && e.status === 404,
            });
        }
        const stored = await getReservations(slug);
        const bookings = await Promise.all(stored.map((r) => api.getBooking(r.uuid).catch(() => null)));
        setMine(bookings.filter((b): b is Booking => !!b));
    }, [slug, navigation, t]);

    useEffect(() => {
        load();
    }, [load]);

    const byDay = useMemo(() => {
        const groups = new Map<string, AvailabilitySlot[]>();
        (page?.available_slots ?? []).forEach((slot) => {
            const key = toDateInput(new Date(slot.start_at));
            groups.set(key, [...(groups.get(key) ?? []), slot]);
        });
        return groups;
    }, [page]);

    useEffect(() => {
        if (!day || !byDay.has(day)) setDay(byDay.keys().next().value ?? null);
    }, [byDay, day]);

    const cancelMine = async (booking: Booking) => {
        const ok = await confirmAsync(t('booking.cancelTitle'), t('booking.cancelMessage'), {
            ok: t('bookings.cancelBooking'),
            cancel: t('common.back'),
            destructive: true,
        });
        if (!ok) return;
        const token = await getCancelToken(booking.uuid);
        if (!token) {
            notify(t('common.error'), t('booking.noCancelToken'));
            return;
        }
        try {
            const res = await api.cancelBooking(booking.uuid, token);
            setMine((list) => list.map((b) => (b.uuid === booking.uuid ? res.booking : b)));
            if (done?.uuid === booking.uuid) setDone(res.booking);
            await load();
        } catch (e) {
            notify(t('common.error'), errorMessage(e, t('common.genericError'), t('common.networkError')));
        }
    };

    const submit = async () => {
        const e: Record<string, string> = {};
        if (!slotId) e.slot = t('booking.selectSlot');
        if (!name.trim()) e.guest_name = t('auth.required');
        if (!EMAIL_RE.test(email.trim())) e.guest_email = t('booking.invalidEmail');
        setErrors(e);
        setFormError(Object.values(e)[0] ?? null);
        if (Object.keys(e).length || !page || !slotId) return;
        setSubmitting(true);
        try {
            const res = await api.reserve(page.slug, {
                slot: slotId,
                guest_name: name.trim(),
                guest_email: email.trim(),
                guest_message: message.trim(),
            });
            await rememberReservation(
                { uuid: res.booking.uuid, slug: page.slug, title: page.title, startAt: res.booking.slot_info?.start_at ?? null },
                res.cancel_token,
            );
            setDone(res.booking);
            setSlotId(null);
            setMessage('');
            await load();
        } catch (err) {
            if (err instanceof ApiError) setErrors(err.fieldErrors);
            setFormError(errorMessage(err, t('common.genericError'), t('common.networkError')));
        } finally {
            setSubmitting(false);
        }
    };

    if (!page && !loadError) return <Loading />;

    return (
        <Screen
            refreshing={refreshing}
            onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
            }}
        >
            {loadError ? (
                <ErrorBanner
                    message={loadError.notFound ? t('booking.notFound') : loadError.message}
                    onRetry={loadError.notFound ? undefined : load}
                    retryLabel={t('common.retry')}
                />
            ) : null}

            {done ? (
                <InfoBanner>
                    <Body style={{ fontWeight: '700' }}>{t('booking.doneTitle')}</Body>
                    {done.slot_info ? <Body>{formatRange(done.slot_info.start_at, done.slot_info.end_at, locale)}</Body> : null}
                    <Body>{t('booking.doneBody')}</Body>
                </InfoBanner>
            ) : null}

            {mine.length ? (
                <Card>
                    <SectionTitle>{t('booking.yourReservations')}</SectionTitle>
                    {mine.map((b) => (
                        <Card key={b.uuid}>
                            {b.slot_info ? <Body style={{ fontWeight: '600' }}>{formatRange(b.slot_info.start_at, b.slot_info.end_at, locale)}</Body> : null}
                            <Badge label={t(`bookingStatus.${b.status}`)} tone={BOOKING_TONE[b.status]} />
                            {b.meeting_url ? <Body selectable>{b.meeting_url}</Body> : null}
                            {b.status === 'pending' || b.status === 'confirmed' ? (
                                <Button title={t('bookings.cancelBooking')} variant="ghost" small onPress={() => cancelMine(b)} />
                            ) : null}
                        </Card>
                    ))}
                </Card>
            ) : null}

            {page ? (
                <>
                    <Card>
                        <Title>{page.title}</Title>
                        <Body muted>{t('booking.host', { name: page.organizer })}</Body>
                        <Body muted>{t('booking.duration', { minutes: page.duration_minutes })}</Body>
                        {page.description ? <Body>{page.description}</Body> : null}
                    </Card>

                    <Card>
                        <SectionTitle>{t('booking.chooseSlot')}</SectionTitle>
                        {byDay.size === 0 ? (
                            <EmptyState message={t('booking.noSlots')} />
                        ) : (
                            <>
                                <Choice
                                    label={t('booking.date')}
                                    options={[...byDay.keys()].map((key) => ({
                                        value: key,
                                        label: formatDate(byDay.get(key)![0].start_at, locale),
                                    }))}
                                    value={day}
                                    onChange={(value) => {
                                        setDay(value);
                                        setSlotId(null);
                                    }}
                                />
                                {day ? (
                                    <Choice
                                        label={t('booking.time')}
                                        options={(byDay.get(day) ?? []).map((slot) => ({
                                            value: slot.id,
                                            label: formatTime(slot.start_at, locale),
                                            accessibilityLabel: formatRange(slot.start_at, slot.end_at, locale),
                                        }))}
                                        value={slotId}
                                        onChange={setSlotId}
                                    />
                                ) : null}
                            </>
                        )}
                    </Card>

                    {byDay.size > 0 ? (
                        <Card>
                            <SectionTitle>{t('booking.yourDetails')}</SectionTitle>
                            <TextField label={`${t('booking.name')} *`} value={name} onChangeText={setName} error={errors.guest_name} maxLength={100} />
                            <TextField
                                label={`${t('booking.email')} *`}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                error={errors.guest_email}
                            />
                            <TextField label={t('booking.message')} value={message} onChangeText={setMessage} multiline />
                            {formError ? <ErrorBanner message={formError} /> : null}
                            <Button title={t('booking.reserve')} onPress={submit} loading={submitting} disabled={!slotId} />
                        </Card>
                    ) : null}
                </>
            ) : null}
        </Screen>
    );
}
