'use client';

import { ChakraProvider, ColorModeScript, extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useState } from 'react';

// Theme configuration (docs/05_ui_design.md)
const config: ThemeConfig = {
    initialColorMode: 'system',
    useSystemColorMode: false,
};

const fontStack =
    'var(--font-inter), "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic UI", "YuGothic", Meiryo, sans-serif';

const theme = extendTheme({
    config,
    fonts: {
        heading: fontStack,
        body: fontStack,
    },
    colors: {
        brand: {
            50: '#EBF4FF',
            100: '#BAE3FF',
            200: '#7CC4FA',
            300: '#4A9EE5',
            400: '#2186EB',
            500: '#0967D2',
            600: '#0552B5',
            700: '#03449E',
            800: '#01337D',
            900: '#002159',
        },
    },
    semanticTokens: {
        colors: {
            'brand.fg': { default: 'brand.500', _dark: 'brand.300' },
            'brand.subtle': { default: 'brand.50', _dark: 'rgba(74, 158, 229, 0.16)' },
            'text.muted': { default: 'gray.600', _dark: 'gray.300' },
            'bg.card': { default: 'white', _dark: 'gray.800' },
            'bg.page': { default: 'gray.50', _dark: 'gray.900' },
            'bg.subtle': { default: 'gray.50', _dark: 'gray.700' },
            'border.default': { default: 'gray.200', _dark: 'gray.700' },
        },
    },
    styles: {
        global: {
            body: {
                bg: 'bg.page',
                color: 'chakra-body-text',
            },
        },
    },
    components: {
        Button: {
            defaultProps: {
                colorScheme: 'brand',
            },
        },
        Card: {
            baseStyle: {
                container: {
                    bg: 'bg.card',
                    borderRadius: 'xl',
                    boxShadow: 'sm',
                    border: '1px solid',
                    borderColor: 'border.default',
                },
            },
        },
        Input: { defaultProps: { focusBorderColor: 'brand.500' } },
        Select: { defaultProps: { focusBorderColor: 'brand.500' } },
        Textarea: { defaultProps: { focusBorderColor: 'brand.500' } },
    },
});

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

    return (
        <QueryClientProvider client={queryClient}>
            <ColorModeScript initialColorMode={config.initialColorMode} />
            <ChakraProvider theme={theme}>
                <MotionConfig reducedMotion="user">{children}</MotionConfig>
            </ChakraProvider>
        </QueryClientProvider>
    );
}
