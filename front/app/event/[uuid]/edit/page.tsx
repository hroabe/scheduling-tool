import type { Metadata } from 'next';
import { EditEventPage } from '@/components/edit/EditEventPage';
import { PageShell } from '@/components/layout/PageShell';
import jaMessages from '@/messages/ja';

export const metadata: Metadata = {
    title: jaMessages.edit.meta.title,
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
