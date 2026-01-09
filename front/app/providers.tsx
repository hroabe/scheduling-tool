'use client';

import { ChakraProvider, extendTheme, type ThemeConfig, ColorModeScript } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useThemeStore, type ThemeMode } from '@/stores/themeStore';
import cuteTheme from '@/providers/cuteTheme';
import { I18nProvider } from '@/providers/I18nProvider';

// Base theme configuration
const config: ThemeConfig = {
    initialColorMode: 'light',
    useSystemColorMode: false,
};

// Pro UI Design System - event-management_pro_ui.md
const defaultTheme = extendTheme({
    config,
    fonts: {
        // 3-1. タイポグラフィ - Noto Sans CJK JP優先
        heading: '"Noto Sans CJK JP", "Noto Sans JP", system-ui, -apple-system, "Segoe UI", sans-serif',
        body: '"Noto Sans CJK JP", "Noto Sans JP", system-ui, -apple-system, "Segoe UI", sans-serif',
    },
    fontSizes: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '28px',
        '4xl': '32px',
    },
    // 3-2. 余白・角丸・影
    radii: {
        none: '0',
        sm: '2px',      // 進捗バー用
        md: '8px',
        lg: '10px',     // 小部品用
        xl: '16px',     // カード用
        full: '9999px', // バッジ用
    },
    shadows: {
        // 薄い影1種類に統一
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
    },
    space: {
        // セクション間: 24-32px, カード内: 16-20px, 行間: 8-12px
        section: '24px',
        sectionLg: '32px',
        cardPadding: '20px',
        rowGap: '12px',
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
                fontFamily: '"Noto Sans CJK JP", "Noto Sans JP", system-ui, sans-serif',
            },
        }),
    },
    components: {
        Button: {
            baseStyle: {
                borderRadius: 'lg', // 10px
                fontWeight: '600',
            },
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
                    _active: {
                        transform: 'translateY(0)',
                    },
                    transition: 'all 0.2s',
                }),
                ghost: {
                    borderRadius: 'lg',
                    _hover: {
                        transform: 'translateY(-1px)',
                    },
                },
                outline: {
                    borderRadius: 'lg',
                    borderWidth: '1.5px',
                },
            },
            sizes: {
                sm: { h: '32px', fontSize: 'sm', px: '12px' },
                md: { h: '40px', fontSize: 'md', px: '16px' },
                lg: { h: '48px', fontSize: 'md', px: '24px' },
            },
        },
        Badge: {
            baseStyle: {
                borderRadius: 'full',
                px: '10px',
                py: '2px',
                fontSize: 'xs',
                fontWeight: '600',
                textTransform: 'none',
            },
            variants: {
                // ステータス用
                status: (props: { status?: string }) => {
                    const statusColors: Record<string, { bg: string; color: string }> = {
                        open: { bg: 'blue.100', color: 'blue.700' },
                        closed: { bg: 'orange.100', color: 'orange.700' },
                        fixed: { bg: 'green.100', color: 'green.700' },
                    };
                    const colors = statusColors[props.status || 'open'] || statusColors.open;
                    return colors;
                },
                // おすすめ用
                recommended: {
                    bg: 'green.100',
                    color: 'green.700',
                },
            },
        },
        Card: {
            baseStyle: (props: { colorMode: string }) => ({
                container: {
                    bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
                    borderRadius: 'xl', // 16px
                    boxShadow: 'card',
                    border: '1px solid',
                    borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.100',
                    overflow: 'hidden',
                },
                body: {
                    p: 'cardPadding', // 20px
                },
                header: {
                    p: 'cardPadding',
                    pb: '12px',
                },
                footer: {
                    p: 'cardPadding',
                    pt: '12px',
                },
            }),
        },
        Tabs: {
            baseStyle: {
                tab: {
                    fontWeight: '600',
                    borderRadius: 'lg',
                    _selected: {
                        color: 'brand.500',
                    },
                },
                tablist: {
                    borderBottomWidth: '1px',
                    borderColor: 'gray.200',
                },
            },
            variants: {
                line: {
                    tab: {
                        borderBottom: '2px solid transparent',
                        mb: '-1px',
                        _selected: {
                            borderColor: 'brand.500',
                            color: 'brand.600',
                        },
                    },
                },
                'soft-rounded': {
                    tab: {
                        borderRadius: 'lg',
                        _selected: {
                            bg: 'brand.50',
                            color: 'brand.600',
                        },
                    },
                },
            },
        },
        Table: {
            baseStyle: {
                th: {
                    bg: 'gray.50',
                    fontWeight: '600',
                    fontSize: 'sm',
                    color: 'gray.600',
                    borderBottomWidth: '1px',
                    borderColor: 'gray.200',
                    py: 3,
                    px: 4,
                    textTransform: 'none',
                },
                td: {
                    py: 3,
                    px: 4,
                    borderBottomWidth: '1px',
                    borderColor: 'gray.200',
                    fontSize: 'sm',
                    color: 'gray.800',
                },
                tr: {
                    _last: {
                        td: {
                            borderBottomWidth: '0px',
                        },
                    },
                    _hover: {
                        bg: 'gray.50',
                    },
                },
            },
        },
        Progress: {
            baseStyle: {
                track: {
                    borderRadius: 'sm', // 2px - 直線バー
                    bg: 'gray.100',
                },
                filledTrack: {
                    borderRadius: 'sm', // 2px - 直線バー
                },
            },
            sizes: {
                sm: { track: { h: '6px' } },
                md: { track: { h: '10px' } },
                lg: { track: { h: '16px' } },
            },
        },
        Input: {
            defaultProps: {
                focusBorderColor: 'brand.500',
            },
            baseStyle: {
                field: {
                    borderRadius: 'lg',
                },
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
            baseStyle: {
                borderRadius: 'lg',
            },
        },
        Container: {
            baseStyle: {
                maxW: '1200px', // maxW統一
                px: { base: '16px', md: '24px' },
            },
        },
    },
});

// Get theme based on mode
function getTheme(mode: ThemeMode) {
    if (mode === 'cute') {
        return cuteTheme;
    }
    return defaultTheme;
}

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

    const themeMode = useThemeStore((state) => state.mode);
    const theme = useMemo(() => getTheme(themeMode), [themeMode]);

    return (
        <QueryClientProvider client={queryClient}>
            <ChakraProvider 
                theme={theme}
                colorModeManager={{
                    type: 'localStorage',
                    get: () => (themeMode === 'dark' ? 'dark' : 'light'),
                    set: () => {}, // Managed by themeStore
                }}
            >
                <I18nProvider>
                    {children}
                </I18nProvider>
            </ChakraProvider>
        </QueryClientProvider>
    );
}


