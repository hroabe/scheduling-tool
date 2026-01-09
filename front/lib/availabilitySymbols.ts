/**
 * Availability Symbols by Language
 * 
 * - ja, ko: ○ △ ×
 * - others: ✓ ? x
 */

export type AvailabilitySymbols = {
  yes: string;
  maybe: string;
  no: string;
  label: string; // e.g., "○△×" or "✓ ? x"
};

export function getAvailabilitySymbols(locale: string): AvailabilitySymbols {
  // Japanese and Korean use circle/triangle/cross
  if (locale === 'ja' || locale === 'ko') {
    return {
      yes: '○',
      maybe: '△',
      no: '×',
      label: '○△×',
    };
  }

  // All other languages use checkmark/question/x
  return {
    yes: '✓',
    maybe: '?',
    no: 'x',
    label: '✓ ? x',
  };
}

/**
 * Get the display text for voting symbols
 * Used in badges, features, etc.
 */
export function getVotingLabel(locale: string): string {
  const symbols = getAvailabilitySymbols(locale);
  return symbols.label;
}
