import type { Metadata } from 'next';
import { EditEventPage } from '@/components/edit/EditEventPage';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: 'イベント編集',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
};

export default async function EditPage({ params }: { params: Promise<{ uuid: string }> }) {
    const { uuid } = await params;
    return (
        <PageShell showFooter={false}>
            <EditEventPage uuid={uuid} />
        </PageShell>
    );
}
