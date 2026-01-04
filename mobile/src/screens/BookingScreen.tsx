/**
 * Public Booking Screen
 * RFC-0005: 1対1日程調整モード
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    FlatList,
} from 'react-native';
import { useTranslation } from '../i18n';
import api from '../shared/api';
import type { AvailabilityPage, AvailabilitySlot } from '../shared/types';
import { formatDateTime } from '../shared/date';

interface Props {
    route: { params: { slug: string } };
    navigation: any;
}

export default function BookingScreen({ route, navigation }: Props) {
    const { slug } = route.params;
    const { t } = useTranslation();
    
    const [page, setPage] = useState<(AvailabilityPage & { available_slots: AvailabilitySlot[] }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadPage();
    }, [slug]);

    const loadPage = async () => {
        try {
            const data = await api.getPublicAvailabilityPage(slug);
            setPage(data);
        } catch (error: any) {
            Alert.alert(t('error'), error.message);
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async () => {
        if (!selectedSlot || !guestName || !guestEmail) {
            Alert.alert(t('error'), t('auth.fillAllFields'));
            return;
        }

        setSubmitting(true);
        try {
            const result = await api.createBooking(slug, {
                slot: selectedSlot.id,
                guest_name: guestName,
                guest_email: guestEmail,
                guest_message: message,
            });
            
            Alert.alert(
                t('booking.confirmed'),
                `${t('booking.cancelToken')}: ${result.cancel_token}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert(t('error'), error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0967D2" />
            </View>
        );
    }

    if (!page) {
        return null;
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>{page.title}</Text>
                <Text style={styles.hostName}>{page.owner_name}</Text>
                {page.description && (
                    <Text style={styles.description}>{page.description}</Text>
                )}
                <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{page.duration_minutes}分</Text>
                </View>
            </View>

            {/* Slot Selection */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('booking.availableSlots')}</Text>
                {page.available_slots.length === 0 ? (
                    <Text style={styles.emptyText}>空き枠がありません</Text>
                ) : (
                    <View style={styles.slotsContainer}>
                        {page.available_slots.map((slot) => (
                            <TouchableOpacity
                                key={slot.id}
                                style={[
                                    styles.slotItem,
                                    selectedSlot?.id === slot.id && styles.slotItemSelected,
                                ]}
                                onPress={() => setSelectedSlot(slot)}
                            >
                                <Text
                                    style={[
                                        styles.slotTime,
                                        selectedSlot?.id === slot.id && styles.slotTimeSelected,
                                    ]}
                                >
                                    {formatDateTime(slot.start_at)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Guest Info Form */}
            {selectedSlot && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ご予約情報</Text>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('booking.guestName')} *</Text>
                        <TextInput
                            style={styles.input}
                            value={guestName}
                            onChangeText={setGuestName}
                            placeholder="山田太郎"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('booking.guestEmail')} *</Text>
                        <TextInput
                            style={styles.input}
                            value={guestEmail}
                            onChangeText={setGuestEmail}
                            placeholder="example@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('booking.message')}</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={message}
                            onChangeText={setMessage}
                            placeholder="ご質問やメッセージがあれば入力してください"
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.bookButton, submitting && styles.buttonDisabled]}
                        onPress={handleBooking}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.bookButtonText}>{t('booking.bookTime')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
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
    header: {
        backgroundColor: '#fff',
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    hostName: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 12,
    },
    durationBadge: {
        backgroundColor: '#e8f4fd',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    durationText: {
        color: '#0967D2',
        fontWeight: '600',
    },
    section: {
        backgroundColor: '#fff',
        marginTop: 16,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    emptyText: {
        color: '#999',
        textAlign: 'center',
        padding: 20,
    },
    slotsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    slotItem: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    slotItemSelected: {
        backgroundColor: '#0967D2',
        borderColor: '#0967D2',
    },
    slotTime: {
        fontSize: 14,
        color: '#333',
    },
    slotTimeSelected: {
        color: '#fff',
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    bookButton: {
        backgroundColor: '#0967D2',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    bookButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
