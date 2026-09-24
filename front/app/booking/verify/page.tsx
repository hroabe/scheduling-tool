import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { BookingVerify } from '@/components/booking/BookingVerify';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: 'メールアドレスの確認',
    referrer: 'no-referrer',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
};

export default function BookingVerifyPage() {
    return (
        <PageShell>
            <Suspense fallback={<CenteredSpinner />}>
                <BookingVerify />
            </Suspense>
        </PageShell>
    );
}
