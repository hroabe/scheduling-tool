import * as Clipboard from 'expo-clipboard';
import { Linking, Platform, Share } from 'react-native';

export async function copyText(text: string): Promise<boolean> {
    try {
        await Clipboard.setStringAsync(text);
        return true;
    } catch {
        return false;
    }
}

/** System share sheet; on web uses navigator.share when available, otherwise copies the URL */
export async function shareLink(url: string, message: string): Promise<'shared' | 'copied' | 'failed'> {
    try {
        if (Platform.OS === 'web') {
            const nav = globalThis.navigator as Navigator | undefined;
            if (nav?.share) {
                await nav.share({ title: message, text: message, url });
                return 'shared';
            }
            return (await copyText(url)) ? 'copied' : 'failed';
        }
        await Share.share(Platform.OS === 'ios' ? { message, url } : { message: `${message}\n${url}` });
        return 'shared';
    } catch {
        return 'failed';
    }
}

export async function openExternal(url: string): Promise<boolean> {
    try {
        await Linking.openURL(url);
        return true;
    } catch {
        return false;
    }
}
