import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { BookingCancel } from '@/components/booking/BookingResult';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: '予約のキャンセル',
    referrer: 'no-referrer',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
};

export default function BookingCancelPage() {
    return (
        <PageShell>
            <Suspense fallback={<CenteredSpinner />}>
                <BookingCancel />
            </Suspense>
        </PageShell>
    );
}
