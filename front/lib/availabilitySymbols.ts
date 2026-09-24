/**
 * Availability (attendance) symbols
 *
 * The same symbols are used everywhere (form, table, summary, CSV legend):
 * - cute theme: 😊 🤔 😢
 * - ja / ko:    ◯ △ ×
 * - others:     ✓ ? ✗
 * The meaning is always also exposed as text (aria-label / legend) for accessibility.
 */

import { useI18n } from '@/providers/I18nProvider';
import { attendanceIcons, useThemeStore } from '@/stores/themeStore';

export type AvailabilitySymbols = {
    yes: string;
    maybe: string;
    no: string;
    /** e.g. "◯△×" or "✓ ? ✗" */
    label: string;
};

export function getAvailabilitySymbols(locale: string, cute = false): AvailabilitySymbols {
    if (cute) {
        const icons = attendanceIcons.cute;
        return { yes: icons.ok, maybe: icons.maybe, no: icons.ng, label: `${icons.ok}${icons.maybe}${icons.ng}` };
    }
    if (locale === 'ja' || locale === 'ko') {
        return { yes: '◯', maybe: '△', no: '×', label: '◯△×' };
    }
    return { yes: '✓', maybe: '?', no: '✗', label: '✓ ? ✗' };
}

/** Get the display text for voting symbols (badges, features, ...) */
export function getVotingLabel(locale: string): string {
    return getAvailabilitySymbols(locale).label;
}

/** Symbols for the current UI language and theme */
export function useAvailabilitySymbols(): AvailabilitySymbols {
    const { locale } = useI18n();
    const cute = useThemeStore((state) => state.mode === 'cute');
    return getAvailabilitySymbols(locale, cute);
}
