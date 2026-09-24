'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker (production builds only, so development
 * never serves stale cached assets).
 */
export function ServiceWorkerRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

        const register = () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // Registration failure only disables offline support
            });
        };

        if (document.readyState === 'complete') {
            register();
        } else {
            window.addEventListener('load', register, { once: true });
        }
    }, []);

    return null;
}
