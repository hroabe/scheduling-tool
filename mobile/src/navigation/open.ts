import type { NavigationProp } from '@react-navigation/native';

import type { LinkTarget } from '../lib/links';
import type { RootStackParamList } from './types';

type Navigator = Pick<NavigationProp<RootStackParamList>, 'navigate'>;

export function openLinkTarget(navigation: Navigator, target: LinkTarget): void {
    switch (target.name) {
        case 'EventDetail':
            navigation.navigate('EventDetail', target.params);
            break;
        case 'Booking':
            navigation.navigate('Booking', target.params);
            break;
        case 'CreateEvent':
            navigation.navigate('CreateEvent');
            break;
    }
}
