import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'イベント作成',
    description: '新しい日程調整イベントを作成します。候補日を設定してURLを共有するだけ。',
    alternates: {
        canonical: '/create',
    },
};

export default function CreateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
