import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'アカウント設定',
    description: 'アカウント情報の管理、連携カレンダーの設定、イベント履歴の確認が行えます。',
    alternates: {
        canonical: '/account',
    },
};

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
