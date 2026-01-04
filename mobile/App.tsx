/**
 * Scheduling Tool Mobile App
 * RFC-0003: Auth, RFC-0001/0002: Calendar, RFC-0005: 1-on-1, RFC-0006: i18n
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens
import CreateScreen from './src/screens/CreateScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AccountScreen from './src/screens/AccountScreen';
import BookingScreen from './src/screens/BookingScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import AvailabilityPagesScreen from './src/screens/AvailabilityPagesScreen';

// i18n
import { initI18n, useTranslation } from './src/i18n';
import { useAuthStore } from './src/shared/authStore';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Home Screen with event list
function HomeScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [recentEvents, setRecentEvents] = React.useState<any[]>([]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{t('schedule.title')}</Text>

            <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('Create')}
            >
                <Text style={styles.buttonText}>+ {t('schedule.create')}</Text>
            </TouchableOpacity>

            <View style={styles.historySection}>
                <Text style={styles.subtitle}>{t('schedule.myEvents')}</Text>
                {recentEvents.length === 0 ? (
                    <Text style={styles.emptyText}>履歴はありません</Text>
                ) : (
                    <FlatList
                        data={recentEvents}
                        keyExtractor={(item) => item.uuid}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => navigation.navigate('Detail', { uuid: item.uuid })}>
                                <Text>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </View>
    );
}

// Main Tab Navigator (for authenticated users)
function MainTabs() {
    const { t } = useTranslation();
    
    return (
        <Tab.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#0967D2' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
                tabBarActiveTintColor: '#0967D2',
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{
                    title: t('schedule.title'),
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text>,
                }}
            />
            <Tab.Screen
                name="BookingsTab"
                component={MyBookingsScreen}
                options={{
                    title: t('account.myBookings'),
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
                }}
            />
            <Tab.Screen
                name="AccountTab"
                component={AccountScreen}
                options={{
                    title: t('account.profile'),
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
                }}
            />
        </Tab.Navigator>
    );
}

// Auth Stack (for unauthenticated users)
function AuthStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#0967D2' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ title: 'ログイン', headerShown: false }}
            />
            <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{ title: '登録', headerShown: false }}
            />
        </Stack.Navigator>
    );
}

// Root Navigator
function RootNavigator() {
    const { isAuthenticated, checkAuth } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            await checkAuth();
            setIsLoading(false);
        };
        init();
    }, []);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0967D2" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
                <>
                    <Stack.Screen name="Main" component={MainTabs} />
                    <Stack.Screen
                        name="Create"
                        component={CreateScreen}
                        options={{
                            headerShown: true,
                            title: '新規作成',
                            headerStyle: { backgroundColor: '#0967D2' },
                            headerTintColor: '#fff',
                        }}
                    />
                    <Stack.Screen
                        name="Detail"
                        component={EventDetailScreen}
                        options={{
                            headerShown: true,
                            title: 'イベント詳細',
                            headerStyle: { backgroundColor: '#0967D2' },
                            headerTintColor: '#fff',
                        }}
                    />
                    <Stack.Screen
                        name="Booking"
                        component={BookingScreen}
                        options={{
                            headerShown: true,
                            title: '予約',
                            headerStyle: { backgroundColor: '#0967D2' },
                            headerTintColor: '#fff',
                        }}
                    />
                    <Stack.Screen
                        name="AvailabilityPages"
                        component={AvailabilityPagesScreen}
                        options={{
                            headerShown: true,
                            title: '予約ページ',
                            headerStyle: { backgroundColor: '#0967D2' },
                            headerTintColor: '#fff',
                        }}
                    />
                </>
            ) : (
                <Stack.Screen name="Auth" component={AuthStack} />
            )}
        </Stack.Navigator>
    );
}

export default function App() {
    const [i18nReady, setI18nReady] = useState(false);

    useEffect(() => {
        initI18n().then(() => setI18nReady(true));
    }, []);

    if (!i18nReady) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0967D2" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <RootNavigator />
                <StatusBar style="light" />
            </NavigationContainer>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
        textAlign: 'center',
        marginTop: 20,
    },
    createButton: {
        backgroundColor: '#0967D2',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 30,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    historySection: {
        flex: 1,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#666',
    },
    emptyText: {
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
    },
});
