/** Cross-platform alert / confirm (react-native-web's Alert.alert is a no-op) */

import { Alert, Platform } from 'react-native';

import { ApiError } from '../api/client';

export function notify(title: string, message?: string): void {
    if (Platform.OS === 'web') {
        globalThis.alert?.(message ? `${title}\n\n${message}` : title);
        return;
    }
    Alert.alert(title, message);
}

export function confirmAsync(
    title: string,
    message: string,
    labels: { ok: string; cancel: string; destructive?: boolean },
): Promise<boolean> {
    if (Platform.OS === 'web') {
        return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
    }
    return new Promise((resolve) => {
        Alert.alert(
            title,
            message,
            [
                { text: labels.cancel, style: 'cancel', onPress: () => resolve(false) },
                { text: labels.ok, style: labels.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
        );
    });
}

/** Message for an error thrown by the API client (falls back to a translated generic text) */
export function errorMessage(error: unknown, fallback: string, networkMessage?: string): string {
    if (error instanceof ApiError) return error.message || fallback;
    if (error instanceof TypeError && networkMessage) return networkMessage; // fetch network failure
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}
