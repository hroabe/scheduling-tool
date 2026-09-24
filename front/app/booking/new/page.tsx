import type { Metadata } from 'next';
import { BookingCreateForm } from '@/components/booking/BookingCreateForm';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: '1on1 予約ページを作成',
    description:
        'ログイン不要で 1on1（面談・商談・相談）の予約ページを作成。空き枠を公開して URL を共有するだけで、相手が都合の良い時間を予約できます。',
    alternates: { canonical: '/booking/new' },
    openGraph: { url: '/booking/new' },
};

export default function BookingNewPage() {
    return (
        <PageShell>
            <BookingCreateForm />
        </PageShell>
    );
}
