import type { Metadata } from 'next';
import { AccountSettings } from '@/components/account/AccountSettings';
import { PageShell } from '@/components/layout/PageShell';

export const metadata: Metadata = {
    title: 'アカウント設定',
};

export default function AccountPage() {
    return (
        <PageShell>
            <AccountSettings />
        </PageShell>
    );
}
