#!/usr/bin/env node
/**
 * Verifies that every locale has exactly the same message keys as `ja` (the source
 * locale) and that no value is empty. Exits with code 1 on any problem.
 *
 *   node scripts/check-messages.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');
const locales = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'de', 'pt'];
const namespaces = JSON.parse(readFileSync(join(root, 'namespaces.json'), 'utf8'));

function flatten(obj, prefix = '') {
    return Object.entries(obj).flatMap(([key, value]) =>
        value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]
    );
}

const problems = [];
for (const ns of namespaces) {
    const source = new Map(flatten(JSON.parse(readFileSync(join(root, 'ja', `${ns}.json`), 'utf8'))));
    for (const locale of locales) {
        const entries = new Map(flatten(JSON.parse(readFileSync(join(root, locale, `${ns}.json`), 'utf8'))));
        for (const key of source.keys()) {
            if (!entries.has(key)) problems.push(`${locale}/${ns}: missing "${key}"`);
            else if (typeof entries.get(key) !== 'string' || !entries.get(key).trim()) {
                problems.push(`${locale}/${ns}: empty "${key}"`);
            }
        }
        for (const key of entries.keys()) {
            if (!source.has(key)) problems.push(`${locale}/${ns}: extra "${key}" (not in ja)`);
        }
        // Interpolation placeholders must match the source
        for (const [key, value] of source) {
            const expected = (String(value).match(/\{\w+\}/g) || []).sort().join();
            const actual = (String(entries.get(key) ?? '').match(/\{\w+\}/g) || []).sort().join();
            if (entries.has(key) && expected !== actual) {
                problems.push(`${locale}/${ns}: placeholders differ for "${key}" (${expected} vs ${actual})`);
            }
        }
    }
}

if (problems.length) {
    console.error(problems.slice(0, 200).join('\n'));
    console.error(`\n${problems.length} problem(s) found`);
    process.exit(1);
}
console.log(`OK: ${locales.length} locales x ${namespaces.length} namespaces are consistent`);
