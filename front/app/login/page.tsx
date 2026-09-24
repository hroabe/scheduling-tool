import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CenteredSpinner } from '@/components/account/CenteredSpinner';
import { LoginForm } from '@/components/account/LoginForm';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: 'ログイン',
    description: 'ログインして、作成したイベントの一覧やカレンダー連携を管理できます。',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
};

export default function LoginPage() {
    return (
        <PageShell>
            <Suspense fallback={<CenteredSpinner />}>
                <LoginForm />
            </Suspense>
        </PageShell>
    );
}
