'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';
import { CenteredSpinner } from './CenteredSpinner';

/**
 * Renders its children only for signed-in users. Visitors are sent to
 * /login?next=<current path> once the auth state has been checked.
 */
export function RequireAuth({ children }: { children: (user: User) => ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isChecked = useAuthStore((state) => state.isChecked);

    const mustLogin = isChecked && (!isAuthenticated || !user);

    useEffect(() => {
        if (mustLogin) router.replace(`/login?next=${encodeURIComponent(pathname || '/account')}`);
    }, [mustLogin, pathname, router]);

    if (!isChecked || !user || !isAuthenticated) return <CenteredSpinner />;
    return <>{children(user)}</>;
}
