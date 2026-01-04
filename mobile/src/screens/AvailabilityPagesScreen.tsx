/**
 * Availability Pages Screen
 * RFC-0005: 1-on-1 Scheduling - Host management
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useTranslation } from '../i18n';
import api from '../shared/api';
import type { AvailabilityPage } from '../shared/types';

interface Props {
    navigation: any;
}

export default function AvailabilityPagesScreen({ navigation }: Props) {
    const { t } = useTranslation();
    const [pages, setPages] = useState<AvailabilityPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadPages = useCallback(async () => {
        try {
            const data = await api.getAvailabilityPages();
            setPages(data);
        } catch (error) {
            console.error('Failed to load pages:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadPages();
    }, [loadPages]);

    const onRefresh = () => {
        setRefreshing(true);
        loadPages();
    };

    const renderItem = ({ item }: { item: AvailabilityPage }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('AvailabilityPageDetail', { id: item.id })}
        >
            <View style={styles.cardContent}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.slug}>/{item.slug}</Text>
                <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                </Text>
            </View>
            <View style={styles.meta}>
                <Text style={styles.duration}>{item.duration_minutes} min</Text>
                <Text style={styles.arrow}>›</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0967D2" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={pages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>
                            {t('booking.noBookings')}
                        </Text>
                    </View>
                }
                contentContainerStyle={pages.length === 0 ? styles.emptyContainer : undefined}
            />
            
            <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateAvailabilityPage')}
            >
                <Text style={styles.createButtonText}>+ Create New Page</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardContent: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    slug: {
        fontSize: 14,
        color: '#0967D2',
        marginTop: 4,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    meta: {
        alignItems: 'flex-end',
    },
    duration: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    arrow: {
        fontSize: 24,
        color: '#ccc',
    },
    empty: {
        padding: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
    createButton: {
        backgroundColor: '#0967D2',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
