import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EventDetail } from '@/components/event/EventDetail';
import { PageShell } from '@/components/layout/PageShell';
import { fetchEventMeta } from '@/lib/server-api';
import jaMessages from '@/messages/ja';

interface EventPageProps {
    params: Promise<{ uuid: string }>;
}

/** Server-rendered metadata is always Japanese (the source locale, see docs/11_integration.md §1) */
function fill(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
    const { uuid } = await params;
    const event = await fetchEventMeta(uuid);
    const meta = jaMessages.event.meta;

    const title = event ? fill(meta.pageTitle, { name: event.name }) : meta.pageTitleFallback;
    const description = event
        ? fill(meta.pageDescription, {
              owner: event.owner_name,
              name: event.name,
              state: event.is_finalized ? meta.pageStateFinalized : meta.pageStateOpen,
          })
        : meta.pageStateOpen;

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
