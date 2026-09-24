import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';

import { api, type ScheduleListItem } from '../api';
import { Badge, Body, Button, Card, EmptyState, ErrorBanner, ListItem, Screen, SectionTitle, TextField, Title } from '../components/ui';
import { useI18n } from '../i18n';
import { formatDate } from '../lib/date';
import { errorMessage } from '../lib/dialogs';
import { parseUserInput } from '../lib/links';
import { openLinkTarget } from '../navigation/open';
import type { TabScreenProps } from '../navigation/types';
import { useIsLoggedIn } from '../stores/authStore';
import { getRecentEvents, type RecentEvent } from '../stores/localEvents';

const STATUS_TONE = { open: 'success', closed: 'warning', fixed: 'primary' } as const;

export default function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
    const { t, locale } = useI18n();
    const loggedIn = useIsLoggedIn();
    const [recent, setRecent] = useState<RecentEvent[]>([]);
    const [mine, setMine] = useState<ScheduleListItem[]>([]);
    const [mineError, setMineError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [link, setLink] = useState('');
    const [linkError, setLinkError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setRecent(await getRecentEvents());
        if (!loggedIn) {
            setMine([]);
            return;
        }
        try {
            const res = await api.mySchedules();
            setMine(res.results);
            setMineError(null);
        } catch (e) {
            setMineError(errorMessage(e, t('common.genericError'), t('common.networkError')));
        }
    }, [loggedIn, t]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const refresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const openLink = () => {
        const target = parseUserInput(link);
        if (!target) {
            setLinkError(t('home.invalidLink'));
            return;
        }
        setLinkError(null);
        setLink('');
        openLinkTarget(navigation, target);
    };

    return (
        <Screen refreshing={refreshing} onRefresh={refresh}>
            <Title>{t('home.title')}</Title>
            <Body muted>{t('home.tagline')}</Body>
            <Button title={t('home.createEvent')} onPress={() => navigation.navigate('CreateEvent')} />

            <Card>
                <SectionTitle>{t('home.openTitle')}</SectionTitle>
                <TextField
                    label={t('home.openLabel')}
                    value={link}
                    onChangeText={(v) => {
                        setLink(v);
                        setLinkError(null);
                    }}
                    placeholder={t('home.openPlaceholder')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="go"
                    onSubmitEditing={openLink}
                    error={linkError}
                />
                <Button title={t('home.open')} variant="secondary" onPress={openLink} disabled={!link.trim()} />
            </Card>

            <Card>
                <SectionTitle>{t('home.myEvents')}</SectionTitle>
                {!loggedIn ? (
                    <>
                        <Body muted>{t('home.loginForMyEvents')}</Body>
                        <Button title={t('auth.login')} variant="ghost" small onPress={() => navigation.navigate('Login')} />
                    </>
                ) : mineError ? (
                    <ErrorBanner message={mineError} onRetry={load} retryLabel={t('common.retry')} />
                ) : mine.length === 0 ? (
                    <EmptyState message={t('home.noMyEvents')} />
                ) : (
                    mine.map((item) => (
                        <ListItem
                            key={item.uuid}
                            title={item.name}
                            subtitle={t('home.eventMeta', {
                                date: formatDate(item.created_at, locale),
                                participants: item.participant_count,
                            })}
                            right={<Badge label={t(`status.${item.status}`)} tone={STATUS_TONE[item.status]} />}
                            onPress={() => navigation.navigate('EventDetail', { uuid: item.uuid })}
                        />
                    ))
                )}
            </Card>

            <Card>
                <SectionTitle>{t('home.recentEvents')}</SectionTitle>
                {recent.length === 0 ? (
                    <EmptyState message={t('home.noRecent')} />
                ) : (
                    recent.map((item) => (
                        <ListItem
                            key={item.uuid}
                            title={item.name}
                            subtitle={formatDate(item.visitedAt, locale)}
                            right={<Badge label={t(`role.${item.role}`)} tone={item.role === 'owner' ? 'primary' : 'neutral'} />}
                            onPress={() => navigation.navigate('EventDetail', { uuid: item.uuid })}
                        />
                    ))
                )}
            </Card>
        </Screen>
    );
}
