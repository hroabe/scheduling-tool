import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { IntegrationsPanel } from '@/components/account/IntegrationsPanel';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: 'カレンダー連携',
};

export default function IntegrationsPage() {
    return (
        <PageShell>
            <Suspense fallback={<CenteredSpinner />}>
                <IntegrationsPanel />
            </Suspense>
        </PageShell>
    );
}
