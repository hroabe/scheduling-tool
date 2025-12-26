'use client';

import { ChakraProvider, extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

// Theme configuration
const config: ThemeConfig = {
    initialColorMode: 'light',
    useSystemColorMode: true,
};

const theme = extendTheme({
    config,
    fonts: {
        heading: '"Inter", "Noto Sans JP", sans-serif',
        body: '"Inter", "Noto Sans JP", sans-serif',
    },
    colors: {
        brand: {
            50: '#E6F6FF',
            100: '#BAE3FF',
            200: '#7CC4FA',
            300: '#47A3F3',
            400: '#2186EB',
            500: '#0967D2',
            600: '#0552B5',
            700: '#03449E',
            800: '#01337D',
            900: '#002159',
        },
    },
    styles: {
        global: (props: { colorMode: string }) => ({
            body: {
                bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
                color: props.colorMode === 'dark' ? 'white' : 'gray.900',
            },
        }),
    },
    components: {
        Button: {
            defaultProps: {
                colorScheme: 'brand',
            },
            variants: {
                solid: (props: { colorMode: string }) => ({
                    bg: props.colorMode === 'dark' ? 'brand.400' : 'brand.500',
                    color: 'white',
                    _hover: {
                        bg: props.colorMode === 'dark' ? 'brand.300' : 'brand.600',
                        transform: 'translateY(-1px)',
                        boxShadow: 'md',
                    },
                    transition: 'all 0.2s',
                }),
                ghost: {
                    _hover: {
                        transform: 'translateY(-1px)',
                    },
                },
            },
        },
        Card: {
            baseStyle: (props: { colorMode: string }) => ({
                container: {
                    bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
                    borderRadius: 'xl',
                    boxShadow: 'sm',
                    border: '1px solid',
                    borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.100',
                },
            }),
        },
        Input: {
            defaultProps: {
                focusBorderColor: 'brand.500',
            },
        },
        Select: {
            defaultProps: {
                focusBorderColor: 'brand.500',
            },
        },
        Textarea: {
            defaultProps: {
                focusBorderColor: 'brand.500',
            },
        },
    },
});

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <ChakraProvider theme={theme}>
                {children}
            </ChakraProvider>
        </QueryClientProvider>
    );
}
