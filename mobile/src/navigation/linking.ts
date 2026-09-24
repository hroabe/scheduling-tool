/**
 * Deep links (expo-linking + React Navigation):
 *   schedulingtool://event/<uuid>   https://<web host>/event/<uuid>
 *   schedulingtool://booking/<slug> https://<web host>/booking/<slug>
 * Opening a link pushes the target screen on top of the tabs so "back" returns to Home.
 */

import { getStateFromPath as defaultGetStateFromPath, type LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import { APP_SCHEME, WEB_URL } from '../config';
import { routeFromPath } from '../lib/links';
import type { RootStackParamList } from './types';

const screens = {
    Main: {
        screens: {
            Home: '',
            OneOnOne: 'oneonone',
            Account: 'account',
        },
    },
    CreateEvent: 'create',
    EventDetail: 'event/:uuid',
    Booking: 'booking/:slug',
    Login: 'login',
    Register: 'register',
    MyBookings: 'account/bookings',
    CreateAvailabilityPage: 'oneonone/new',
    AvailabilityPageDetail: { path: 'oneonone/pages/:id', parse: { id: Number } },
};

export function buildPrefixes(webUrl: string): string[] {
    const prefixes = new Set<string>([Linking.createURL('/'), `${APP_SCHEME}://`]);
    prefixes.add(webUrl);
    // accept both http and https for the configured web host
    const host = webUrl.replace(/^https?:\/\//, '');
    prefixes.add(`https://${host}`);
    prefixes.add(`http://${host}`);
    return [...prefixes];
}

export const linking: LinkingOptions<RootStackParamList> = {
    prefixes: buildPrefixes(WEB_URL),
    config: { screens },
    getStateFromPath(path, options) {
        const target = routeFromPath(path);
        if (target) {
            return {
                routes: [{ name: 'Main' }, { name: target.name, params: target.params }],
            } as ReturnType<typeof defaultGetStateFromPath>;
        }
        return defaultGetStateFromPath(path, options);
    },
};
