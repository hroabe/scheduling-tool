import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { RegisterForm } from '@/components/account/RegisterForm';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: 'アカウント登録',
    description: 'アカウントを作成すると、作成したイベントの一覧やカレンダー連携が使えます。',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
};

export default function RegisterPage() {
    return (
        <PageShell>
            <Suspense fallback={<CenteredSpinner />}>
                <RegisterForm />
            </Suspense>
        </PageShell>
    );
}
