/**
 * Account Screen
 * RFC-0003: ユーザー認証 / RFC-0001/0002: カレンダー連携
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Linking,
} from 'react-native';
import { useAuthStore } from '../shared/authStore';
import { useTranslation } from '../i18n';
import api from '../shared/api';
import type { UserIntegration } from '../shared/types';

interface Props {
    navigation: any;
}

export default function AccountScreen({ navigation }: Props) {
    const { t } = useTranslation();
    const { user, logout, isLoading } = useAuthStore();
    const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
    const [loadingIntegrations, setLoadingIntegrations] = useState(true);

    useEffect(() => {
        loadIntegrations();
    }, []);

    const loadIntegrations = async () => {
        try {
            const data = await api.getIntegrations();
            setIntegrations(data);
        } catch (error) {
            console.error('Failed to load integrations:', error);
        } finally {
            setLoadingIntegrations(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigation.replace('Login');
        } catch (error: any) {
            Alert.alert(t('error'), error.message);
        }
    };

    const handleConnectGoogle = async () => {
        try {
            const { auth_url } = await api.getGoogleConnectUrl();
            await Linking.openURL(auth_url);
        } catch (error: any) {
            Alert.alert(t('error'), error.message);
        }
    };

    const handleConnectOutlook = async () => {
        try {
            const { auth_url } = await api.getOutlookConnectUrl();
            await Linking.openURL(auth_url);
        } catch (error: any) {
            Alert.alert(t('error'), error.message);
        }
    };

    const handleDisconnect = async (provider: 'google' | 'outlook') => {
        Alert.alert(
            t('confirm'),
            t('integration.disconnectConfirm'),
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('disconnect'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (provider === 'google') {
                                await api.disconnectGoogle();
                            } else {
                                await api.disconnectOutlook();
                            }
                            loadIntegrations();
                        } catch (error: any) {
                            Alert.alert(t('error'), error.message);
                        }
                    },
                },
            ]
        );
    };

    const googleIntegration = integrations.find(i => i.provider === 'google' && i.is_active);
    const outlookIntegration = integrations.find(i => i.provider === 'outlook' && i.is_active);

    return (
        <ScrollView style={styles.container}>
            {/* Profile Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('account.profile')}</Text>
                <View style={styles.card}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.username?.charAt(0).toUpperCase() || '?'}
                        </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.username}>{user?.username}</Text>
                        <Text style={styles.email}>{user?.email}</Text>
                    </View>
                </View>
            </View>

            {/* Integrations Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('account.integrations')}</Text>
                
                {loadingIntegrations ? (
                    <ActivityIndicator style={styles.loader} />
                ) : (
                    <>
                        {/* Google Calendar */}
                        <View style={styles.integrationCard}>
                            <View style={styles.integrationInfo}>
                                <Text style={styles.integrationIcon}>📅</Text>
                                <View>
                                    <Text style={styles.integrationName}>Google Calendar</Text>
                                    <Text style={styles.integrationStatus}>
                                        {googleIntegration
                                            ? t('integration.connected')
                                            : t('integration.notConnected')}
                                    </Text>
                                </View>
                            </View>
                            {googleIntegration ? (
                                <TouchableOpacity
                                    style={styles.disconnectButton}
                                    onPress={() => handleDisconnect('google')}
                                >
                                    <Text style={styles.disconnectText}>{t('disconnect')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.connectButton}
                                    onPress={handleConnectGoogle}
                                >
                                    <Text style={styles.connectText}>{t('connect')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Outlook Calendar */}
                        <View style={styles.integrationCard}>
                            <View style={styles.integrationInfo}>
                                <Text style={styles.integrationIcon}>📆</Text>
                                <View>
                                    <Text style={styles.integrationName}>Outlook Calendar</Text>
                                    <Text style={styles.integrationStatus}>
                                        {outlookIntegration
                                            ? t('integration.connected')
                                            : t('integration.notConnected')}
                                    </Text>
                                </View>
                            </View>
                            {outlookIntegration ? (
                                <TouchableOpacity
                                    style={styles.disconnectButton}
                                    onPress={() => handleDisconnect('outlook')}
                                >
                                    <Text style={styles.disconnectText}>{t('disconnect')}</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.connectButton}
                                    onPress={handleConnectOutlook}
                                >
                                    <Text style={styles.connectText}>{t('connect')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}
            </View>

            {/* My Bookings */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navigation.navigate('MyBookings')}
                >
                    <Text style={styles.menuIcon}>📋</Text>
                    <Text style={styles.menuText}>{t('account.myBookings')}</Text>
                    <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navigation.navigate('AvailabilityPages')}
                >
                    <Text style={styles.menuIcon}>🗓️</Text>
                    <Text style={styles.menuText}>{t('account.availabilityPages')}</Text>
                    <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Logout */}
            <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#dc3545" />
                ) : (
                    <Text style={styles.logoutText}>{t('auth.logout')}</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    section: {
        backgroundColor: '#fff',
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0967D2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileInfo: {
        flex: 1,
    },
    username: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    email: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    loader: {
        padding: 20,
    },
    integrationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    integrationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    integrationIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    integrationName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    integrationStatus: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    connectButton: {
        backgroundColor: '#0967D2',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    connectText: {
        color: '#fff',
        fontWeight: '600',
    },
    disconnectButton: {
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    disconnectText: {
        color: '#dc3545',
        fontWeight: '600',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    menuIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    menuArrow: {
        fontSize: 20,
        color: '#999',
    },
    logoutButton: {
        margin: 20,
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#dc3545',
    },
    logoutText: {
        color: '#dc3545',
        fontSize: 16,
        fontWeight: '600',
    },
});
