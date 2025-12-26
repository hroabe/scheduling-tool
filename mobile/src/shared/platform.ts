import { ActionSheetIOS, Alert, Platform, ToastAndroid } from 'react-native';

export function showToast(message: string) {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
        // iOS doesn't have a native toast, so we could use a library or just an Alert
        Alert.alert('Notification', message);
    }
}

export function alert(title: string, message: string) {
    Alert.alert(title, message);
}
