import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';

import { api, type AvailabilityPageListItem } from '../api';
import { Badge, Body, Button, Card, EmptyState, ErrorBanner, ListItem, Row, Screen, SectionTitle, Title } from '../components/ui';
import { useI18n } from '../i18n';
import { errorMessage } from '../lib/dialogs';
import type { TabScreenProps } from '../navigation/types';
import { useIsLoggedIn } from '../stores/authStore';

export default function AvailabilityPagesScreen({ navigation }: TabScreenProps<'OneOnOne'>) {
    const { t } = useI18n();
    const loggedIn = useIsLoggedIn();
    const [pages, setPages] = useState<AvailabilityPageListItem[]>([]);
    const [nextPage, setNextPage] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const load = useCallback(
        async (page = 1) => {
            if (!loggedIn) return;
            try {
                const res = await api.listPages(page);
                setPages((prev) => (page === 1 ? res.results : [...prev, ...res.results]));
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
                <Title>{t('pages.title')}</Title>
                <Card>
                    <Body>{t('pages.loginRequired')}</Body>
                    <Button title={t('auth.login')} onPress={() => navigation.navigate('Login')} />
                    <Button title={t('auth.register')} variant="secondary" onPress={() => navigation.navigate('Register')} />
                </Card>
            </Screen>
        );
    }

    return (
        <Screen
            refreshing={refreshing}
            onRefresh={async () => {
                setRefreshing(true);
                await load(1);
                setRefreshing(false);
            }}
        >
            <Title>{t('pages.title')}</Title>
            <Body muted>{t('pages.subtitle')}</Body>
            <Row>
                <Button title={t('pages.create')} onPress={() => navigation.navigate('CreateAvailabilityPage')} style={{ flexGrow: 1 }} />
                <Button title={t('account.myBookings')} variant="secondary" onPress={() => navigation.navigate('MyBookings')} style={{ flexGrow: 1 }} />
            </Row>
            {error ? <ErrorBanner message={error} onRetry={() => load(1)} retryLabel={t('common.retry')} /> : null}
            <Card>
                <SectionTitle>{t('pages.listTitle')}</SectionTitle>
                {loaded && pages.length === 0 && !error ? <EmptyState message={t('pages.empty')} /> : null}
                {pages.map((page) => (
                    <ListItem
                        key={page.id}
                        title={page.title}
                        subtitle={t('pages.meta', {
                            slug: page.slug,
                            minutes: page.duration_minutes,
                            slots: page.available_slots_count,
                        })}
                        right={
                            <Badge
                                label={page.is_public && page.is_active ? t('pages.public') : t('pages.private')}
                                tone={page.is_public && page.is_active ? 'success' : 'neutral'}
                            />
                        }
                        onPress={() => navigation.navigate('AvailabilityPageDetail', { id: page.id, title: page.title })}
                    />
                ))}
                {nextPage ? <Button title={t('common.loadMore')} variant="ghost" small onPress={() => load(nextPage)} /> : null}
            </Card>
        </Screen>
    );
}
