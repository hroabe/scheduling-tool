import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { KeycloakCallback } from '@/components/account/KeycloakCallback';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: 'ログイン処理中',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
};

export default function CallbackPage() {
    return (
        <PageShell showFooter={false}>
            <Suspense fallback={<CenteredSpinner />}>
                <KeycloakCallback />
            </Suspense>
        </PageShell>
    );
}
