/**
 * Chakra UI themes
 *
 * - proTheme: default "Pro UI" design system (docs/frontend/event-management_pro_ui.md)
 *   with the brand palette of docs/05_ui_design.md and dark-mode aware semantic tokens.
 * - cuteTheme: RFC-0008 "かわいいモード" (pastel, rounded). Primary shades are darkened
 *   so white text on buttons keeps WCAG AA contrast.
 *
 * Components should prefer the semantic tokens (bg.card, bg.page, bg.subtle,
 * border.default, text.muted, brand.fg, brand.subtle) so they work in every theme.
 */

import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
    initialColorMode: 'system',
    useSystemColorMode: false,
};

const systemFonts =
    'var(--font-inter), "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic UI", "YuGothic", Meiryo, system-ui, sans-serif';

const roundedFonts =
    '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", var(--font-inter), "Hiragino Sans", "Yu Gothic UI", Meiryo, sans-serif';

const semanticTokens = {
    colors: {
        'brand.fg': { default: 'brand.600', _dark: 'brand.300' },
        'brand.subtle': { default: 'brand.50', _dark: 'rgba(74, 158, 229, 0.16)' },
        'text.muted': { default: 'gray.600', _dark: 'gray.300' },
        'bg.card': { default: 'white', _dark: 'gray.800' },
        'bg.page': { default: 'gray.50', _dark: 'gray.900' },
        'bg.subtle': { default: 'gray.50', _dark: 'gray.700' },
        'border.default': { default: 'gray.200', _dark: 'gray.700' },
    },
};

export const proTheme = extendTheme({
    config,
    fonts: { heading: systemFonts, body: systemFonts },
    radii: {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '10px',
        xl: '16px',
        '2xl': '20px',
        full: '9999px',
    },
    shadows: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
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
    semanticTokens,
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
            baseStyle: { borderRadius: 'lg', fontWeight: '600' },
            defaultProps: { colorScheme: 'brand' },
        },
        Badge: {
            baseStyle: { borderRadius: 'full', px: '8px', textTransform: 'none', fontWeight: '600' },
        },
        Card: {
            baseStyle: {
                container: {
                    bg: 'bg.card',
                    borderRadius: 'xl',
                    boxShadow: 'card',
                    border: '1px solid',
                    borderColor: 'border.default',
                },
            },
        },
        Table: {
            baseStyle: {
                th: { textTransform: 'none', letterSpacing: 'normal', fontWeight: '600', color: 'text.muted' },
            },
        },
        Input: { defaultProps: { focusBorderColor: 'brand.500' }, baseStyle: { field: { borderRadius: 'lg' } } },
        Select: { defaultProps: { focusBorderColor: 'brand.500' } },
        Textarea: { defaultProps: { focusBorderColor: 'brand.500' } },
    },
});

export const cuteTheme = extendTheme(
    {
        fonts: { heading: roundedFonts, body: roundedFonts },
        colors: {
            brand: {
                50: '#FFF0F5',
                100: '#FFE4EC',
                200: '#FFBCD0',
                300: '#FF94B4',
                400: '#E0457F',
                500: '#C2185B',
                600: '#A3154D',
                700: '#86113F',
                800: '#690D32',
                900: '#4D0924',
            },
            cute: {
                pink: '#FFB6C1',
                lavender: '#E6E6FA',
                mint: '#98FB98',
                peach: '#FFDAB9',
                sky: '#87CEEB',
                cream: '#FFFDD0',
            },
        },
        semanticTokens: {
            colors: {
                'brand.subtle': { default: 'brand.50', _dark: 'rgba(255, 148, 180, 0.16)' },
                'bg.card': { default: 'rgba(255, 255, 255, 0.92)', _dark: 'gray.800' },
                'bg.page': { default: '#FFF5F9', _dark: 'gray.900' },
                'border.default': { default: 'brand.100', _dark: 'gray.700' },
            },
        },
        styles: {
            global: {
                body: {
                    bg: 'bg.page',
                    bgImage: 'linear-gradient(135deg, #FFF0F5 0%, #F3F0FF 50%, #FFE4EC 100%)',
                    _dark: { bgImage: 'none' },
                    bgAttachment: 'fixed',
                },
            },
        },
        radii: { sm: '8px', md: '14px', lg: '18px', xl: '24px', '2xl': '32px', full: '9999px' },
        shadows: {
            card: '0 2px 10px rgba(194, 24, 91, 0.10)',
        },
        components: {
            Button: {
                baseStyle: { borderRadius: 'full', fontWeight: 'bold' },
            },
            Card: {
                baseStyle: {
                    container: {
                        borderRadius: '2xl',
                        border: '2px solid',
                        borderColor: 'border.default',
                        backdropFilter: 'blur(8px)',
                    },
                },
            },
            Heading: { baseStyle: { color: 'brand.fg' } },
        },
    },
    proTheme
);
