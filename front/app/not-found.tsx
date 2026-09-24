import type { Metadata } from 'next';
import { StatusPage } from '@/components/layout/StatusPage';

export const metadata: Metadata = {
    title: 'ページが見つかりません',
    robots: { index: false, follow: true },
};

export default function NotFound() {
    return (
        <StatusPage
            code="404"
            title="ページが見つかりません"
            message="お探しのページは移動または削除された可能性があります。URLをご確認ください。"
            action={{ label: 'イベントを作成する', href: '/create' }}
        />
    );
}
