import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'イベント詳細',
    description: '日程調整イベントの詳細ページです。候補日の確認や回答、集計結果の確認ができます。',
    robots: {
        index: false, // Prevent indexing of specific event pages by default to protect privacy, unless explicitly allowed
        follow: false,
    },
};

export default function EventLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
