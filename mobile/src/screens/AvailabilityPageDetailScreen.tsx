import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { api, type AvailabilityPageDetail, type AvailabilitySlot, type Booking } from '../api';
import BookingCard from '../components/BookingCard';
import DateTimeField from '../components/DateTimeField';
import { Badge, Body, Button, Card, Choice, EmptyState, ErrorBanner, ListItem, Loading, Row, Screen, SectionTitle, SwitchRow, Title } from '../components/ui';
import { WEB_URL } from '../config';
import { useI18n } from '../i18n';
import { addDays, addMinutes, formatRange, nextFullHour } from '../lib/date';
import { confirmAsync, errorMessage, notify } from '../lib/dialogs';
import { copyText, shareLink } from '../lib/share';
import { buildSlots } from '../lib/slots';
import type { RootScreenProps } from '../navigation/types';

const SLOT_COUNTS = [1, 2, 3, 4, 6, 8];

export default function AvailabilityPageDetailScreen({ navigation, route }: RootScreenProps<'AvailabilityPageDetail'>) {
    const { id } = route.params;
    const { t, locale } = useI18n();
    const [page, setPage] = useState<AvailabilityPageDetail | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [start, setStart] = useState<Date>(() => addDays(nextFullHour(), 1));
    const [count, setCount] = useState(1);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [detail, list] = await Promise.all([api.getPage(id), api.pageBookings(id)]);
            setPage(detail);
            setBookings(list);
            setError(null);
            navigation.setOptions({ title: detail.title });
        } catch (e) {
            setError(errorMessage(e, t('common.genericError'), t('common.networkError')));
        }
    }, [id, navigation, t]);

    useEffect(() => {
        load();
    }, [load]);

    const slots = useMemo(
        () => [...(page?.slots ?? [])].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
        [page],
    );

    if (!page) {
        return error ? (
            <Screen>
                <ErrorBanner message={error} onRetry={load} retryLabel={t('common.retry')} />
            </Screen>
        ) : (
            <Loading />
        );
    }

    const publicUrl = `${WEB_URL}/booking/${page.slug}`;
    const now = Date.now();

    const run = async (name: string, action: () => Promise<void>) => {
        setBusy(name);
        try {
            await action();
        } catch (e) {
            notify(t('common.error'), errorMessage(e, t('common.genericError'), t('common.networkError')));
        } finally {
            setBusy(null);
        }
    };

    const addSlots = () =>
        run('add', async () => {
            const res = await api.addSlots(page.id, buildSlots(start, count, page.duration_minutes, page.buffer_minutes));
            if (res.errors.length) notify(t('pages.slotsPartial', { created: res.created.length, failed: res.errors.length }));
            setStart(addMinutes(start, count * (page.duration_minutes + page.buffer_minutes)));
            await load();
        });

    const deleteSlot = (slot: AvailabilitySlot) =>
        run(`slot${slot.id}`, async () => {
            await api.deleteSlot(page.id, slot.id);
            await load();
        });

    return (
        <Screen
            refreshing={refreshing}
            onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
            }}
        >
            <Card>
                <Row style={{ justifyContent: 'space-between' }}>
                    <Title style={{ flex: 1 }}>{page.title}</Title>
                    <Badge label={page.is_public ? t('pages.public') : t('pages.private')} tone={page.is_public ? 'success' : 'neutral'} />
                </Row>
                {page.description ? <Body>{page.description}</Body> : null}
                <Body muted>{t('pages.detailMeta', { minutes: page.duration_minutes, buffer: page.buffer_minutes, tz: page.timezone_name })}</Body>
                <Body muted selectable>
                    {publicUrl}
                </Body>
                <Row>
                    <Button title={t('event.share')} small onPress={() => shareLink(publicUrl, page.title)} />
                    <Button
                        title={t('common.copy')}
                        variant="ghost"
                        small
                        onPress={async () => notify((await copyText(publicUrl)) ? t('common.copied') : t('common.genericError'))}
                    />
                    <Button title={t('pages.preview')} variant="ghost" small onPress={() => navigation.navigate('Booking', { slug: page.slug })} />
                </Row>
                <SwitchRow
                    label={t('pages.isPublic')}
                    hint={t('pages.isPublicHint')}
                    value={page.is_public}
                    onValueChange={(value) =>
                        run('public', async () => {
                            await api.updatePage(page.id, { is_public: value });
                            await load();
                        })
                    }
                />
            </Card>

            <Card>
                <SectionTitle>{t('pages.addSlots')}</SectionTitle>
                <DateTimeField label={t('pages.slotStart')} mode="datetime" value={start} minimumDate={new Date()} onChange={setStart} />
                <Choice
                    label={t('pages.slotCount')}
                    options={SLOT_COUNTS.map((n) => ({ value: n, label: String(n) }))}
                    value={count}
                    onChange={setCount}
                />
                <Body muted>
                    {t('pages.slotPreview', {
                        range: formatRange(start, addMinutes(start, count * page.duration_minutes + (count - 1) * page.buffer_minutes), locale),
                    })}
                </Body>
                <Button title={t('pages.addSlotsSubmit')} onPress={addSlots} loading={busy === 'add'} disabled={!!busy} />
            </Card>

            <Card>
                <SectionTitle>{t('pages.slots', { count: slots.length })}</SectionTitle>
                {slots.length === 0 ? <EmptyState message={t('pages.noSlots')} /> : null}
                {slots.map((slot) => {
                    const past = new Date(slot.start_at).getTime() < now;
                    return (
                        <ListItem
                            key={slot.id}
                            title={formatRange(slot.start_at, slot.end_at, locale)}
                            subtitle={slot.is_booked ? t('pages.booked') : past ? t('pages.past') : t('pages.available')}
                            right={
                                slot.is_booked ? (
                                    <Badge label={t('pages.booked')} tone="warning" />
                                ) : (
                                    <Button
                                        title={t('common.delete')}
                                        variant="ghost"
                                        small
                                        loading={busy === `slot${slot.id}`}
                                        disabled={!!busy}
                                        onPress={() => deleteSlot(slot)}
                                    />
                                )
                            }
                        />
                    );
                })}
            </Card>

            <SectionTitle>{t('pages.bookings', { count: bookings.length })}</SectionTitle>
            {bookings.length === 0 ? <EmptyState message={t('bookings.empty')} /> : null}
            {bookings.map((booking) => (
                <BookingCard key={booking.uuid} booking={booking} onChanged={() => load()} />
            ))}

            <Button
                title={t('pages.delete')}
                variant="danger"
                loading={busy === 'delete'}
                disabled={!!busy}
                onPress={async () => {
                    const ok = await confirmAsync(t('pages.deleteTitle'), t('pages.deleteMessage', { title: page.title }), {
                        ok: t('common.delete'),
                        cancel: t('common.cancel'),
                        destructive: true,
                    });
                    if (ok) {
                        run('delete', async () => {
                            await api.deletePage(page.id);
                            navigation.goBack();
                        });
                    }
                }}
            />
        </Screen>
    );
}
