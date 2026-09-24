import type { Metadata } from 'next';
import { MyEventsList } from '@/components/account/MyEventsList';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: 'マイイベント',
};

export default function MyEventsPage() {
    return (
        <PageShell>
            <MyEventsList />
        </PageShell>
    );
}
