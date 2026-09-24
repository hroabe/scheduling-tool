import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CreateScheduleForm } from '@/components/create/CreateScheduleForm';
import { RefTracker } from '@/components/landing/RefTracker';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
    title: '日程調整イベントを作成（登録不要・無料）',
    description:
        'イベント名と候補日を入力するだけで日程調整ページを作成できます。会員登録不要・無料。複数日をまとめて選んで、作成したURLを共有して◯△×で出欠を集めましょう。',
    alternates: { canonical: '/create' },
    openGraph: { url: '/create' },
};

const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ホーム', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'イベント作成', item: absoluteUrl('/create') },
    ],
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CreatePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    // Mode selector on the landing page: `?mode=group` (this page) / `?mode=1on1` (booking pages)
    const { mode } = await searchParams;
    if (mode === '1on1') {
        redirect('/booking/new');
    }

    return (
        <PageShell>
            <JsonLd data={breadcrumb} />
            {/* Stores `?ref=` (e.g. response_cta) for growth attribution */}
            <Suspense fallback={null}>
                <RefTracker />
            </Suspense>
            <CreateScheduleForm />
        </PageShell>
    );
}
