/**
 * Scheduling Tool — mobile app (Expo SDK 52)
 * Group scheduling (docs/11_integration.md), RFC-0003 auth, RFC-0005 1-on-1, RFC-0006 i18n, RFC-0008 themes.
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { onUnauthorized } from './src/api/session';
import { Loading } from './src/components/ui';
import { I18nProvider, useI18n } from './src/i18n';
import { linking } from './src/navigation/linking';
import type { RootStackParamList, TabParamList } from './src/navigation/types';
import AccountScreen from './src/screens/AccountScreen';
import AvailabilityPageDetailScreen from './src/screens/AvailabilityPageDetailScreen';
import AvailabilityPagesScreen from './src/screens/AvailabilityPagesScreen';
import BookingScreen from './src/screens/BookingScreen';
import CreateAvailabilityPageScreen from './src/screens/CreateAvailabilityPageScreen';
import CreateEventScreen from './src/screens/CreateEventScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { useAuthStore } from './src/stores/authStore';
import { ThemeProvider, useTheme } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
    return (
        <Text style={{ fontSize: 18, color }} accessibilityElementsHidden importantForAccessibility="no">
            {glyph}
        </Text>
    );
}

function MainTabs() {
    const { t } = useI18n();
    const { colors, cute } = useTheme();
    return (
        <Tab.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.header },
                headerTintColor: colors.onHeader,
                headerTitleStyle: { fontWeight: '700' },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.muted,
                tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    title: t('nav.home'),
                    tabBarIcon: ({ color }) => <TabIcon glyph={cute ? '🌸' : '📅'} color={color} />,
                }}
            />
            <Tab.Screen
                name="OneOnOne"
                component={AvailabilityPagesScreen}
                options={{
                    title: t('nav.oneOnOne'),
                    tabBarIcon: ({ color }) => <TabIcon glyph={cute ? '🎀' : '🤝'} color={color} />,
                }}
            />
            <Tab.Screen
                name="Account"
                component={AccountScreen}
                options={{
                    title: t('nav.account'),
                    tabBarIcon: ({ color }) => <TabIcon glyph={cute ? '🐰' : '👤'} color={color} />,
                }}
            />
        </Tab.Navigator>
    );
}

function RootNavigator() {
    const { t } = useI18n();
    const theme = useTheme();
    const hydrated = useAuthStore((s) => s.hydrated);

    useEffect(() => {
        const unsubscribe = onUnauthorized(() => useAuthStore.getState().clearSession());
        useAuthStore.getState().hydrate();
        return unsubscribe;
    }, []);

    const navigationTheme = useMemo<NavigationTheme>(() => {
        const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
        return {
            ...base,
            colors: {
                ...base.colors,
                primary: theme.colors.primary,
                background: theme.colors.background,
                card: theme.colors.card,
                text: theme.colors.text,
                border: theme.colors.border,
            },
        };
    }, [theme]);

    if (!hydrated) return <Loading />;

    return (
        <NavigationContainer theme={navigationTheme} linking={linking} fallback={<Loading />}>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: { backgroundColor: theme.colors.header },
                    headerTintColor: theme.colors.onHeader,
                    headerTitleStyle: { fontWeight: '700' },
                    headerBackTitle: t('common.back'),
                }}
            >
                <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
                <Stack.Screen name="CreateEvent" component={CreateEventScreen} options={{ title: t('nav.createEvent') }} />
                <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: t('nav.event') }} />
                <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('auth.login'), presentation: 'modal' }} />
                <Stack.Screen name="Register" component={RegisterScreen} options={{ title: t('auth.register'), presentation: 'modal' }} />
                <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: t('account.myBookings') }} />
                <Stack.Screen name="CreateAvailabilityPage" component={CreateAvailabilityPageScreen} options={{ title: t('pages.create') }} />
                <Stack.Screen
                    name="AvailabilityPageDetail"
                    component={AvailabilityPageDetailScreen}
                    options={({ route }) => ({ title: route.params.title ?? t('pages.title') })}
                />
                <Stack.Screen name="Booking" component={BookingScreen} options={{ title: t('booking.title') }} />
            </Stack.Navigator>
            <StatusBar style={theme.scheme === 'dark' || !theme.cute ? 'light' : 'dark'} />
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <SafeAreaProvider>
            <I18nProvider>
                <ThemeProvider>
                    <RootNavigator />
                </ThemeProvider>
            </I18nProvider>
        </SafeAreaProvider>
    );
}
