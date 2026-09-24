/**
 * FAQ content shared by the FAQ page, the landing page and FAQPage structured data.
 *
 * The text lives in `messages/<locale>/faq.json` under `items.<key>.q` / `items.<key>.a`,
 * so the UI is translated with `useI18n().t(...)`. `faqItems` is the Japanese (source)
 * version used for server-rendered structured data.
 */

import jaFaq from '@/messages/ja/faq.json';

/** Display order on the /faq page */
export const faqKeys = [
    'noLogin',
    'price',
    'oneOnOne',
    'account',
    'calendarSync',
    'csv',
    'ics',
    'editAfter',
    'editKey',
    'editResponse',
    'languages',
    'theme',
    'mobile',
    'visibility',
] as const satisfies readonly (keyof typeof jaFaq.items)[];

export type FaqKey = (typeof faqKeys)[number];

/** Questions shown as an excerpt on the landing page */
export const landingFaqKeys: readonly FaqKey[] = ['noLogin', 'oneOnOne', 'csv', 'ics', 'calendarSync'];

export interface FaqItem {
    key: FaqKey;
    question: string;
    answer: string;
}

type Translate = (key: string) => string;

export const faqQuestionKey = (key: FaqKey) => `faq.items.${key}.q`;
export const faqAnswerKey = (key: FaqKey) => `faq.items.${key}.a`;

/** Resolve FAQ items with a translate function (e.g. `useI18n().t`) */
export function getFaqItems(t: Translate, keys: readonly FaqKey[] = faqKeys): FaqItem[] {
    return keys.map((key) => ({ key, question: t(faqQuestionKey(key)), answer: t(faqAnswerKey(key)) }));
}

/** Japanese FAQ items (source locale), used for FAQPage JSON-LD */
export const faqItems: FaqItem[] = faqKeys.map((key) => ({
    key,
    question: jaFaq.items[key].q,
    answer: jaFaq.items[key].a,
}));
