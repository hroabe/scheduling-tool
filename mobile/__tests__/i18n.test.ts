import fs from 'fs';
import path from 'path';

import {
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    detectLocale,
    dictionaries,
    flattenKeys,
    interpolate,
    translate,
    type Dictionary,
} from '../src/i18n/core';

function lookup(dict: Dictionary, key: string): string | undefined {
    let node: string | Dictionary | undefined = dict;
    for (const part of key.split('.')) {
        if (!node || typeof node === 'string') return undefined;
        node = node[part];
    }
    return typeof node === 'string' ? node : undefined;
}

const placeholders = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

describe('locale dictionaries', () => {
    const jaKeys = flattenKeys(dictionaries.ja).sort();

    it('supports exactly 8 locales', () => {
        expect([...SUPPORTED_LOCALES].sort()).toEqual(['de', 'en', 'es', 'fr', 'ja', 'ko', 'pt', 'zh']);
    });

    it.each(SUPPORTED_LOCALES)('%s has the same keys as ja', (locale) => {
        expect(flattenKeys(dictionaries[locale]).sort()).toEqual(jaKeys);
    });

    it.each(SUPPORTED_LOCALES)('%s has non-empty strings with the same {{placeholders}} as ja', (locale) => {
        for (const key of jaKeys) {
            const value = lookup(dictionaries[locale], key);
            expect(typeof value).toBe('string');
            expect((value as string).trim()).not.toBe('');
            expect({ key, vars: placeholders(value as string) }).toEqual({
                key,
                vars: placeholders(lookup(dictionaries.ja, key) as string),
            });
        }
    });

    it('non-Japanese locales are actually translated', () => {
        for (const locale of SUPPORTED_LOCALES.filter((l) => l !== 'ja')) {
            const same = jaKeys.filter((k) => lookup(dictionaries[locale], k) === lookup(dictionaries.ja, k));
            // only locale-neutral strings such as "OK" may be identical
            expect(same.length).toBeLessThan(jaKeys.length * 0.05);
        }
    });
});

describe('keys used in the source exist', () => {
    const root = path.join(__dirname, '..');
    const files: string[] = [path.join(root, 'App.tsx')];
    const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
        }
    };
    walk(path.join(root, 'src'));

    const DYNAMIC: Record<string, string[]> = {
        attendance: ['ok', 'maybe', 'ng'],
        bookingStatus: ['pending', 'confirmed', 'cancelled', 'completed'],
        role: ['owner', 'participant', 'viewer'],
        status: ['open', 'closed', 'fixed'],
    };

    const used = new Set<string>();
    for (const file of files) {
        const source = fs.readFileSync(file, 'utf8');
        for (const match of source.matchAll(/\bt\(\s*(['`])([a-zA-Z0-9_.${}]+)\1/g)) {
            const key = match[2];
            if (key.includes('${')) {
                const prefix = key.split('.${')[0];
                for (const suffix of DYNAMIC[prefix] ?? []) used.add(`${prefix}.${suffix}`);
                if (!DYNAMIC[prefix]) used.add(`<unknown dynamic key ${key}>`);
            } else {
                used.add(key);
            }
        }
    }

    it('finds translation calls', () => {
        expect(used.size).toBeGreaterThan(100);
    });

    it.each([...used].sort())('%s is defined in ja', (key) => {
        expect(lookup(dictionaries.ja, key)).toBeDefined();
    });
});

describe('translate / detectLocale', () => {
    it('interpolates variables', () => {
        expect(interpolate('Hello {{ name }} ({{n}})', { name: 'A', n: 2 })).toBe('Hello A (2)');
        expect(interpolate('{{missing}}', {})).toBe('{{missing}}');
        expect(translate('en', 'event.organizer', { name: 'Ann' })).toBe('Organizer: Ann');
    });

    it('falls back to ja and then to the key', () => {
        expect(translate('en', 'no.such.key')).toBe('no.such.key');
        expect(DEFAULT_LOCALE).toBe('ja');
    });

    it('picks the first supported device language', () => {
        expect(detectLocale([{ languageCode: 'fr', languageTag: 'fr-CA' }])).toBe('fr');
        expect(detectLocale([{ languageCode: 'zh', languageTag: 'zh-Hant-TW' }])).toBe('zh');
        expect(detectLocale([{ languageCode: 'it' }, { languageCode: 'de' }])).toBe('de');
        expect(detectLocale([{ languageCode: null, languageTag: 'ko-KR' }])).toBe('ko');
        expect(detectLocale([{ languageCode: 'it' }])).toBe('en');
        expect(detectLocale([])).toBe('en');
    });
});
