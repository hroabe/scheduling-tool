/**
 * My Bookings Screen
 * RFC-0005: 1対1日程調整モード
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    FlatList,
    RefreshControl,
} from 'react-native';
import { useTranslation } from '../i18n';
import api from '../shared/api';
import type { Booking } from '../shared/types';
import { formatDateTime } from '../shared/date';

interface Props {
    navigation: any;
}

export default function MyBookingsScreen({ navigation }: Props) {
    const { t } = useTranslation();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        try {
            const data = await api.getMyBookings();
            setBookings(data);
        } catch (error: any) {
            console.error('Failed to load bookings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleConfirm = async (booking: Booking) => {
        try {
            await api.confirmBooking(parseInt(booking.uuid));
            Alert.alert(t('common.success'), t('booking.confirmed'));
            loadBookings();
        } catch (error: any) {
            Alert.alert(t('error'), error.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return '#28a745';
            case 'pending': return '#ffc107';
            case 'cancelled': return '#dc3545';
            case 'completed': return '#6c757d';
            default: return '#666';
        }
    };

    const renderBookingItem = ({ item }: { item: Booking }) => (
        <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
                <Text style={styles.bookingTitle}>{item.page_title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status_display}</Text>
                </View>
            </View>
            
            <View style={styles.bookingDetails}>
                <Text style={styles.guestInfo}>
                    👤 {item.guest_name} ({item.guest_email})
                </Text>
                {item.slot_info && (
                    <Text style={styles.timeInfo}>
                        🕐 {formatDateTime(item.slot_info.start_at)}
                    </Text>
                )}
                {item.meeting_url && (
                    <Text style={styles.meetingUrl}>
                        🔗 {item.meeting_url}
                    </Text>
                )}
            </View>

            {item.status === 'pending' && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={() => handleConfirm(item)}
                    >
                        <Text style={styles.confirmButtonText}>確定する</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0967D2" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={bookings}
                keyExtractor={(item) => item.uuid}
                renderItem={renderBookingItem}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadBookings();
                        }}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📅</Text>
                        <Text style={styles.emptyText}>{t('booking.noBookings')}</Text>
                    </View>
                }
                contentContainerStyle={bookings.length === 0 ? styles.emptyList : undefined}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyList: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    bookingCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    bookingTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    bookingDetails: {
        gap: 8,
    },
    guestInfo: {
        fontSize: 14,
        color: '#333',
    },
    timeInfo: {
        fontSize: 14,
        color: '#666',
    },
    meetingUrl: {
        fontSize: 12,
        color: '#0967D2',
    },
    actions: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 12,
    },
    confirmButton: {
        backgroundColor: '#28a745',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});
