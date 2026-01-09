/**
 * Theme Store - RFC-0008 Cute Mode Support
 * 
 * Manages theme state: 'light' | 'dark' | 'cute'
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'cute';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'cute'];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',

      setMode: (mode) => set({ mode }),

      cycleMode: () => {
        const currentIndex = THEME_CYCLE.indexOf(get().mode);
        const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
        set({ mode: THEME_CYCLE[nextIndex] });
      },
    }),
    {
      name: 'scheduling-tool-theme',
    }
  )
);

// Attendance icons per theme
export const attendanceIcons = {
  light: { ok: '◯', maybe: '△', ng: '×' },
  dark: { ok: '◯', maybe: '△', ng: '×' },
  cute: { ok: '😊', maybe: '🤔', ng: '😢' },
};

// Theme display labels
export const themeLabels: Record<ThemeMode, string> = {
  light: 'ライト',
  dark: 'ダーク',
  cute: 'かわいい',
};

// Theme icons for toggle button
export const themeIcons: Record<ThemeMode, string> = {
  light: '☀️',
  dark: '🌙',
  cute: '🌸',
};
