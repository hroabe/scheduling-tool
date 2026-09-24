import type { Metadata } from 'next';
import { StatusPage } from '@/components/layout/StatusPage';

export const metadata: Metadata = {
    title: 'オフライン',
    robots: { index: false, follow: false },
};

export default function OfflinePage() {
    return (
        <StatusPage
            title="オフラインです"
            message="インターネットに接続されていません。接続を確認してから再度お試しください。"
        />
    );
}
