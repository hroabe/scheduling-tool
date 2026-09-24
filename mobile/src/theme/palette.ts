/**
 * Colour palettes (pure). Mirrors the web semantic tokens (docs/11_integration.md §3):
 * brand #0967D2, light / dark, and the RFC-0008 "cute" pastel palette (Phase 2) in both schemes.
 */

export type ColorScheme = 'light' | 'dark';
export type ThemeMode = 'system' | ColorScheme;

export interface Palette {
    background: string;
    card: string;
    subtle: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
    /** text/icon colour on top of `primary` */
    onPrimary: string;
    primarySubtle: string;
    danger: string;
    success: string;
    warning: string;
    ok: string;
    maybe: string;
    ng: string;
    header: string;
    onHeader: string;
}

export interface Theme {
    scheme: ColorScheme;
    cute: boolean;
    colors: Palette;
    radius: number;
}

const light: Palette = {
    background: '#F7FAFC',
    card: '#FFFFFF',
    subtle: '#EDF2F7',
    border: '#E2E8F0',
    text: '#1A202C',
    muted: '#4A5568',
    primary: '#0967D2',
    onPrimary: '#FFFFFF',
    primarySubtle: '#EBF4FF',
    danger: '#C53030',
    success: '#2F855A',
    warning: '#B7791F',
    ok: '#2F855A',
    maybe: '#B7791F',
    ng: '#C53030',
    header: '#0967D2',
    onHeader: '#FFFFFF',
};

const dark: Palette = {
    background: '#171923',
    card: '#1A202C',
    subtle: '#2D3748',
    border: '#2D3748',
    text: '#F7FAFC',
    muted: '#CBD5E0',
    primary: '#4A9EE5',
    onPrimary: '#0B1B2E',
    primarySubtle: 'rgba(74, 158, 229, 0.16)',
    danger: '#FC8181',
    success: '#68D391',
    warning: '#F6E05E',
    ok: '#68D391',
    maybe: '#F6E05E',
    ng: '#FC8181',
    header: '#1A202C',
    onHeader: '#F7FAFC',
};

const cuteLight: Palette = {
    ...light,
    background: '#FFF5F9',
    card: '#FFFFFF',
    subtle: '#FFF0F5',
    border: '#FFBCD0',
    text: '#4D0924',
    muted: '#86113F',
    primary: '#C2185B',
    onPrimary: '#FFFFFF',
    primarySubtle: '#FFE4EC',
    header: '#FFB6C1',
    onHeader: '#4D0924',
};

const cuteDark: Palette = {
    ...dark,
    background: '#1F1218',
    card: '#2B1822',
    subtle: '#3A2030',
    border: '#5A2D42',
    text: '#FFF0F5',
    muted: '#E8B8C8',
    primary: '#FF94B4',
    onPrimary: '#4D0924',
    primarySubtle: 'rgba(255, 148, 180, 0.16)',
    header: '#3A2030',
    onHeader: '#FFF0F5',
};

export function resolveScheme(mode: ThemeMode, system: ColorScheme | null | undefined): ColorScheme {
    if (mode === 'light' || mode === 'dark') return mode;
    return system === 'dark' ? 'dark' : 'light';
}

export function buildTheme(scheme: ColorScheme, cute: boolean): Theme {
    const colors = cute ? (scheme === 'dark' ? cuteDark : cuteLight) : scheme === 'dark' ? dark : light;
    return { scheme, cute, colors, radius: cute ? 18 : 10 };
}
