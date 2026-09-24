import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { BookingDone } from '@/components/booking/BookingResult';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: '予約完了',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
};

export default async function BookingDonePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return (
        <PageShell>
            <Suspense fallback={<CenteredSpinner />}>
                <BookingDone slug={slug} />
            </Suspense>
        </PageShell>
    );
}
