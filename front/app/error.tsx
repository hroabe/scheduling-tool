'use client';

import { useEffect } from 'react';
import { StatusPage } from '@/components/layout/StatusPage';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <StatusPage
            title="home.errorTitle"
            message="home.errorMessage"
            action={{ label: 'home.errorRetry', onClick: reset }}
        />
    );
}
