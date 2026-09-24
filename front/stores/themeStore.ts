/**
 * Theme Store - RFC-0008 Cute Mode Support
 *
 * mode: 'light' | 'dark' | 'cute', or null to follow the OS setting (default).
 * Light/dark is applied through Chakra's color mode (persisted, no flash on reload);
 * 'cute' switches the Chakra theme object and forces the light color mode.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'cute';

interface ThemeState {
    mode: ThemeMode | null;
    setMode: (mode: ThemeMode | null) => void;
    cycleMode: () => void;
}

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'cute'];

const safeLocalStorage = () =>
    typeof window === 'undefined'
        ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
        : window.localStorage;

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            mode: null,
            setMode: (mode) => set({ mode }),
            cycleMode: () => {
                const current = get().mode ?? 'light';
                const next = THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length];
                set({ mode: next });
            },
        }),
        { name: 'scheduling-tool-theme', storage: createJSONStorage(safeLocalStorage) }
    )
);

/** Attendance marks per theme (cute mode uses faces; the textual meaning stays in aria-labels) */
export const attendanceIcons: Record<ThemeMode, { ok: string; maybe: string; ng: string }> = {
    light: { ok: '◯', maybe: '△', ng: '×' },
    dark: { ok: '◯', maybe: '△', ng: '×' },
    cute: { ok: '😊', maybe: '🤔', ng: '😢' },
};

/** Theme icons for the toggle menu */
export const themeIcons: Record<ThemeMode, string> = {
    light: '☀️',
    dark: '🌙',
    cute: '🌸',
};
