/** Host-side booking row with confirm / cancel (legacy authenticated `oneonone/bookings/` API, by uuid) */

import React, { useState } from 'react';
import { View } from 'react-native';

import { api, type Booking, type BookingStatus } from '../api';
import { useI18n } from '../i18n';
import { formatRange } from '../lib/date';
import { confirmAsync, errorMessage, notify } from '../lib/dialogs';
import { Badge, Body, Button, Card, Row } from './ui';

export const BOOKING_TONE: Record<BookingStatus, 'warning' | 'success' | 'neutral' | 'primary'> = {
    pending: 'warning',
    confirmed: 'success',
    cancelled: 'neutral',
    completed: 'primary',
};

export default function BookingCard({ booking, onChanged }: { booking: Booking; onChanged: (booking: Booking) => void }) {
    const { t, locale } = useI18n();
    const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);

    const run = async (action: 'confirm' | 'cancel') => {
        if (action === 'cancel') {
            const ok = await confirmAsync(t('bookings.cancelTitle'), t('bookings.cancelMessage', { name: booking.guest_name }), {
                ok: t('bookings.cancelBooking'),
                cancel: t('common.back'),
                destructive: true,
            });
            if (!ok) return;
        }
        setBusy(action);
        try {
            const res =
                action === 'confirm' ? await api.confirmHostBooking(booking.uuid) : await api.cancelHostBooking(booking.uuid);
            onChanged(res.booking);
        } catch (e) {
            notify(t('common.error'), errorMessage(e, t('common.genericError'), t('common.networkError')));
        } finally {
            setBusy(null);
        }
    };

    const slot = booking.slot_info;
    return (
        <Card>
            <Row style={{ justifyContent: 'space-between' }}>
                <Body style={{ fontWeight: '700', flex: 1 }}>{booking.guest_name}</Body>
                <Badge label={t(`bookingStatus.${booking.status}`)} tone={BOOKING_TONE[booking.status]} />
            </Row>
            {slot ? <Body>{formatRange(slot.start_at, slot.end_at, locale)}</Body> : null}
            <Body muted>{booking.page_title}</Body>
            <Body muted selectable>
                {booking.guest_email}
            </Body>
            {booking.guest_message ? <Body>{booking.guest_message}</Body> : null}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {booking.status === 'pending' ? (
                    <Button title={t('bookings.confirm')} small loading={busy === 'confirm'} disabled={!!busy} onPress={() => run('confirm')} />
                ) : null}
                {booking.status === 'pending' || booking.status === 'confirmed' ? (
                    <Button
                        title={t('bookings.cancelBooking')}
                        variant="ghost"
                        small
                        loading={busy === 'cancel'}
                        disabled={!!busy}
                        onPress={() => run('cancel')}
                    />
                ) : null}
            </View>
        </Card>
    );
}
