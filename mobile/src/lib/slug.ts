/** Slugs for 1-on-1 booking pages: ASCII letters/digits/hyphens (non-ASCII titles would 404 on the web) */

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,98})[a-z0-9]$/;

export function slugifyAscii(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)
        .replace(/-+$/g, '');
}

export function randomSuffix(length = 6): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

export function suggestSlug(title: string, suffix = randomSuffix()): string {
    const base = slugifyAscii(title) || 'meeting';
    return `${base}-${suffix}`;
}

export function isValidSlug(slug: string): boolean {
    return SLUG_PATTERN.test(slug);
}
