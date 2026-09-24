import type { Metadata } from 'next';
import { StatusPage } from '@/components/layout/StatusPage';

export const metadata: Metadata = {
    title: 'ページが見つかりません',
    robots: { index: false, follow: true },
};

export default function NotFound() {
    return (
        <StatusPage
            code="404"
            title="home.notFoundTitle"
            message="home.notFoundMessage"
            action={{ label: 'home.createEvent', href: '/create' }}
        />
    );
}
