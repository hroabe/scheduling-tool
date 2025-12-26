import React from 'react';
import { View, Text, Button, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import CreateScreen from './src/screens/CreateScreen'; // Import the new screen
import EventDetailScreen from './src/screens/EventDetailScreen'; // Import the new screen

function HomeScreen({ navigation }: any) {
    // Mock data or fetch from API
    // implementing a simple list for demo
    const [recentEvents, setRecentEvents] = React.useState<any[]>([]);

    // Load recent events (mock)
    // In real app, use AsyncStorage to store created UUIDs and fetch them

    return (
        <View style={styles.container}>
            <Text style={styles.title}>日程調整ツール</Text>

            <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('Create')}
            >
                <Text style={styles.buttonText}>+ 新しいイベントを作成</Text>
            </TouchableOpacity>

            <View style={styles.historySection}>
                <Text style={styles.subtitle}>最近のイベント</Text>
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

const Stack = createStackNavigator();

export default function App() {
    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator
                    screenOptions={{
                        headerStyle: {
                            backgroundColor: '#0967D2',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                    }}
                >
                    <Stack.Screen
                        name="Home"
                        component={HomeScreen}
                        options={{ title: 'イベント一覧' }}
                    />
                    <Stack.Screen
                        name="Create"
                        component={CreateScreen}
                        options={{ title: '新規作成' }}
                    />
                    <Stack.Screen
                        name="Detail"
                        component={EventDetailScreen}
                        options={{ title: 'イベント詳細' }}
                    />
                </Stack.Navigator>
                <StatusBar style="light" />
            </NavigationContainer>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
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
        marginTop: 40,
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
        marginBottom: 40,
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
    }
});
