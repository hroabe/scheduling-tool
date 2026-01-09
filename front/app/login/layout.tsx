import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ログイン',
    description: '日程調整ツールにログインして、イベントの管理や履歴を確認しましょう。',
    alternates: {
        canonical: '/login',
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
