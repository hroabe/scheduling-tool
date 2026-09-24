/** Bookings received on the logged-in user's availability pages (legacy authenticated API) */

import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';

import { api, type Booking, type BookingStatus } from '../api';
import BookingCard from '../components/BookingCard';
import { Body, Button, Card, Choice, EmptyState, ErrorBanner, Screen } from '../components/ui';
import { useI18n } from '../i18n';
import { errorMessage } from '../lib/dialogs';
import type { RootScreenProps } from '../navigation/types';
import { useIsLoggedIn } from '../stores/authStore';

type Filter = 'all' | BookingStatus;

export default function MyBookingsScreen({ navigation }: RootScreenProps<'MyBookings'>) {
    const { t } = useI18n();
    const loggedIn = useIsLoggedIn();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [nextPage, setNextPage] = useState<number | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(
        async (page = 1) => {
            if (!loggedIn) return;
            try {
                const res = await api.hostBookings(page);
                setBookings((prev) => (page === 1 ? res.results : [...prev, ...res.results]));
                setNextPage(res.next ? page + 1 : null);
                setError(null);
            } catch (e) {
                setError(errorMessage(e, t('common.genericError'), t('common.networkError')));
            } finally {
                setLoaded(true);
            }
        },
        [loggedIn, t],
    );

    useFocusEffect(
        useCallback(() => {
            load(1);
        }, [load]),
    );

    if (!loggedIn) {
        return (
            <Screen>
                <Card>
                    <Body>{t('pages.loginRequired')}</Body>
                    <Button title={t('auth.login')} onPress={() => navigation.navigate('Login')} />
                </Card>
            </Screen>
        );
    }

    const visible = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);
    const filters: { value: Filter; label: string }[] = [
        { value: 'all', label: t('bookings.all') },
        { value: 'pending', label: t('bookingStatus.pending') },
        { value: 'confirmed', label: t('bookingStatus.confirmed') },
        { value: 'cancelled', label: t('bookingStatus.cancelled') },
    ];

    return (
        <Screen
            refreshing={refreshing}
            onRefresh={async () => {
                setRefreshing(true);
                await load(1);
                setRefreshing(false);
            }}
        >
            <Choice options={filters} value={filter} onChange={setFilter} />
            {error ? <ErrorBanner message={error} onRetry={() => load(1)} retryLabel={t('common.retry')} /> : null}
            {loaded && visible.length === 0 && !error ? <EmptyState message={t('bookings.empty')} /> : null}
            {visible.map((booking) => (
                <BookingCard
                    key={booking.uuid}
                    booking={booking}
                    onChanged={(updated) => setBookings((list) => list.map((b) => (b.uuid === updated.uuid ? updated : b)))}
                />
            ))}
            {nextPage ? <Button title={t('common.loadMore')} variant="ghost" small onPress={() => load(nextPage)} /> : null}
        </Screen>
    );
}
