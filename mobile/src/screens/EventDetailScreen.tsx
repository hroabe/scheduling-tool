import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Share,
    Button,
} from 'react-native';
import api from '../shared/api';
import type { Schedule } from '../shared/types';
import { formatDate, formatDateTime } from '../shared/date';

export default function EventDetailScreen({ route, navigation }: any) {
    const { uuid } = route.params;
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSchedule();
    }, [uuid]);

    const loadSchedule = async () => {
        try {
            const data = await api.getSchedule(uuid);
            setSchedule(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const onShare = async () => {
        if (!schedule) return;
        try {
            await Share.share({
                message: `${schedule.name}の日程調整をお願いします\n${schedule.url}`,
                url: schedule.url, // iOS only
            });
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0967D2" />
            </View>
        );
    }

    if (!schedule) {
        return (
            <View style={styles.center}>
                <Text>イベントが見つかりませんでした</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{schedule.name}</Text>
                <Text style={styles.owner}>主催: {schedule.owner_name}</Text>
                {schedule.description ? (
                    <Text style={styles.description}>{schedule.description}</Text>
                ) : null}
                <View style={styles.shareButton}>
                    <Button title="URLを共有" onPress={onShare} color="#0967D2" />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>候補日</Text>
                {schedule.candidates.map((c) => (
                    <View key={c.id} style={styles.item}>
                        <Text style={styles.date}>{formatDate(c.start_at, 'M/d(E)')}</Text>
                        <Text style={styles.time}>{c.start_at.split('T')[1].slice(0, 5)} - {c.end_at.split('T')[1].slice(0, 5)}</Text>
                        <View style={styles.counts}>
                            <Text style={[styles.count, { color: 'green' }]}>◯ {c.ok_count}</Text>
                            <Text style={[styles.count, { color: '#DAA520' }]}>△ {c.maybe_count}</Text>
                            <Text style={[styles.count, { color: 'red' }]}>× {c.ng_count}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>参加者 ({schedule.participants.length}名)</Text>
                {schedule.participants.length === 0 ? (
                    <Text style={{ color: '#666' }}>まだ回答がありません</Text>
                ) : (
                    schedule.participants.map((p) => (
                        <View key={p.id} style={styles.participant}>
                            <Text style={styles.participantName}>{p.name}</Text>
                            {p.comment ? <Text style={styles.comment}>{p.comment}</Text> : null}
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 20,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    owner: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 16,
    },
    shareButton: {
        marginTop: 8,
    },
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    date: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    time: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    counts: {
        flexDirection: 'row',
        gap: 8,
    },
    count: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    participant: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    participantName: {
        fontSize: 16,
        fontWeight: '500',
    },
    comment: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
});
