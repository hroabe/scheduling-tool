'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAttributionStore } from '@/stores';

/**
 * Stores the first-touch acquisition channel (`?ref=` or `?utm_source=`) in
 * localStorage so it can be attached to the next event creation.
 */
export function RefTracker() {
    const searchParams = useSearchParams();
    const setRef = useAttributionStore((state) => state.setRef);

    useEffect(() => {
        const ref = searchParams.get('ref') || searchParams.get('utm_source');
        if (ref && /^[\w-]{1,50}$/.test(ref)) {
            setRef(ref);
        }
    }, [searchParams, setRef]);

    return null;
}
