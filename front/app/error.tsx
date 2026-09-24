'use client';

import { useEffect } from 'react';
import { StatusPage } from '@/components/layout/StatusPage';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <StatusPage
            title="エラーが発生しました"
            message="一時的な問題が発生しました。時間をおいて再度お試しください。"
            action={{ label: '再読み込み', onClick: reset }}
        />
    );
}
