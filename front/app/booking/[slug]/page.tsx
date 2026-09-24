import type { Metadata } from 'next';
import { BookingGuestPage } from '@/components/booking/BookingGuestPage';
import { PageShell } from '@/components/layout/PageShell';

// Booking pages are private-by-URL: never indexed
export const metadata: Metadata = {
    title: '1on1 予約',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
};

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return (
        <PageShell>
            <BookingGuestPage slug={slug} />
        </PageShell>
    );
}
