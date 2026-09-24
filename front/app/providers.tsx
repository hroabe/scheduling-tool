'use client';

import { ChakraProvider, ColorModeScript, useColorMode } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { I18nProvider } from '@/providers/I18nProvider';
import { cuteTheme, proTheme } from '@/providers/theme';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

const ROUNDED_FONT_URL = 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700&display=swap';

/** Keeps Chakra's color mode in sync with the theme store and loads the cute font lazily */
function ThemeModeSync() {
    const mode = useThemeStore((state) => state.mode);
    const { colorMode, setColorMode } = useColorMode();
    const previousMode = useRef(mode);

    useEffect(() => {
        if (mode === 'dark' && colorMode !== 'dark') setColorMode('dark');
        if ((mode === 'light' || mode === 'cute') && colorMode !== 'light') setColorMode('light');
        // "Follow the system" is already applied by ColorModeScript on load; only reset it when the
        // user switches back from an explicit mode (avoids a full re-render on every page load)
        if (mode === null && previousMode.current !== null) setColorMode('system');
        previousMode.current = mode;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    useEffect(() => {
        if (mode !== 'cute' || document.getElementById('cute-font')) return;
        const link = document.createElement('link');
        link.id = 'cute-font';
        link.rel = 'stylesheet';
        link.href = ROUNDED_FONT_URL;
        document.head.appendChild(link);
    }, [mode]);

    return null;
}

/** Restores the signed-in user (session / Keycloak / token) once per page load */
function AuthBootstrap() {
    const checkAuth = useAuthStore((state) => state.checkAuth);
    useEffect(() => {
        void checkAuth();
    }, [checkAuth]);
    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30 * 1000,
                        gcTime: 5 * 60 * 1000,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );
    const mode = useThemeStore((state) => state.mode);
    // The server always renders the default theme; switch after mount to avoid hydration mismatches
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const theme = mounted && mode === 'cute' ? cuteTheme : proTheme;

    return (
        <QueryClientProvider client={queryClient}>
            <ColorModeScript initialColorMode="system" />
            <ChakraProvider theme={theme}>
                <ThemeModeSync />
                <AuthBootstrap />
                <I18nProvider>
                    <MotionConfig reducedMotion="user">{children}</MotionConfig>
                </I18nProvider>
            </ChakraProvider>
        </QueryClientProvider>
    );
}
