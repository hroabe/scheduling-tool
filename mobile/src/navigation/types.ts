import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabParamList = {
    Home: undefined;
    OneOnOne: undefined;
    Account: undefined;
};

export type RootStackParamList = {
    Main: NavigatorScreenParams<TabParamList> | undefined;
    CreateEvent: undefined;
    EventDetail: { uuid: string; created?: boolean };
    Login: undefined;
    Register: undefined;
    MyBookings: undefined;
    CreateAvailabilityPage: undefined;
    AvailabilityPageDetail: { id: number; title?: string };
    Booking: { slug: string };
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
    BottomTabScreenProps<TabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
>;

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace ReactNavigation {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
        interface RootParamList extends RootStackParamList {}
    }
}
