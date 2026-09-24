import type { Metadata } from 'next';
import { StatusPage } from '@/components/layout/StatusPage';

export const metadata: Metadata = {
    title: 'オフライン',
    robots: { index: false, follow: false },
};

export default function OfflinePage() {
    return <StatusPage title="home.offlineTitle" message="home.offlineMessage" />;
}
