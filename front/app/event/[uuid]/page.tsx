import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EventDetail } from '@/components/event/EventDetail';
import { PageShell } from '@/components/layout/PageShell';
import { fetchEventMeta } from '@/lib/server-api';

interface EventPageProps {
    params: Promise<{ uuid: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
    const { uuid } = await params;
    const event = await fetchEventMeta(uuid);

    const title = event ? `${event.name}の日程調整` : '日程調整';
    const description = event
        ? `${event.owner_name}さんが「${event.name}」の日程調整をしています。${
              event.is_finalized ? '日程が確定しました。' : '候補日から◯△×で回答してください（登録不要）。'
          }`
        : '候補日から◯△×で回答してください（登録不要）。';

    return {
        title,
        description,
        // Event pages are private-by-URL: keep them out of search results
        robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
        alternates: { canonical: null },
        openGraph: { title, description, url: `/event/${uuid}`, type: 'website' },
        twitter: { title, description },
    };
}

export default async function EventPage({ params }: EventPageProps) {
    const { uuid } = await params;
    return (
        <PageShell>
            <Suspense fallback={null}>
                <EventDetail uuid={uuid} />
            </Suspense>
        </PageShell>
    );
}
