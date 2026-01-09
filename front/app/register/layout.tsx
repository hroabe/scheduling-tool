import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'アカウント登録',
    description: '日程調整ツールのアカウントを作成。カレンダー連携やより便利な機能を利用できます。',
    alternates: {
        canonical: '/register',
    },
};

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
