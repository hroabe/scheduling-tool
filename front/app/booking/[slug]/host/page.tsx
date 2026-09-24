import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { BookingHostPanel } from '@/components/booking/BookingHostPanel';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: '予約ページの管理',
    // The management link may carry a secret: never leak it through the Referer header
    referrer: 'no-referrer',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
};

export default async function BookingHostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return (
        <PageShell>
            <Suspense fallback={<CenteredSpinner />}>
                <BookingHostPanel slug={slug} />
            </Suspense>
        </PageShell>
    );
}
