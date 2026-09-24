import type { Metadata } from 'next';
import { CreateScheduleForm } from '@/components/create/CreateScheduleForm';
import { PageShell } from '@/components/layout/PageShell';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
    title: '日程調整イベントを作成（登録不要・無料）',
    description:
        'イベント名と候補日を入力するだけで日程調整ページを作成できます。会員登録不要・無料。作成したURLを共有して◯△×で出欠を集めましょう。',
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

export default function CreatePage() {
    return (
        <PageShell>
            <JsonLd data={breadcrumb} />
            <CreateScheduleForm />
        </PageShell>
    );
}
