import { expect, test } from '@playwright/test';
import { createEvent } from './helpers';

test.describe('SEO', () => {
    test('トップページのメタデータと構造化データ', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/日程調整/);
        await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /登録不要/);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https?:\/\/[^/]+\/?$/);
        await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.png/);
        await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/);
        await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /maximum-scale=5/);
        await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.json');
        await expect(page.locator('h1')).toHaveCount(1);

        const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
        const types = jsonLd.flatMap((text) => {
            const data = JSON.parse(text);
            return (Array.isArray(data) ? data : [data]).map((d) => d['@type']);
        });
        expect(types).toEqual(expect.arrayContaining(['WebSite', 'Organization', 'WebApplication', 'HowTo']));
    });

    test('FAQページにFAQPage構造化データがある', async ({ page }) => {
        await page.goto('/faq');
        await expect(page.locator('h1')).toHaveText('よくある質問');
        const jsonLd = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('');
        expect(jsonLd).toContain('"FAQPage"');
        expect(jsonLd).toContain('"BreadcrumbList"');
    });

    test('robots.txt と sitemap.xml', async ({ request }) => {
        const robots = await (await request.get('/robots.txt')).text();
        expect(robots).toContain('Sitemap:');
        expect(robots).not.toMatch(/Disallow: \/event/);
        const sitemap = await (await request.get('/sitemap.xml')).text();
        for (const path of ['/create', '/faq', '/privacy', '/terms']) {
            expect(sitemap).toContain(path);
        }
        expect(sitemap).not.toContain('/event/');
    });

    test('イベントページは noindex で、OGPにイベント名が入る', async ({ page, request }) => {
        const uuid = await createEvent(page, { name: 'OGP確認イベント', days: 1 });
        const response = await request.get(`/event/${uuid}`);
        expect(response.headers()['x-robots-tag']).toContain('noindex');
        const html = await response.text();
        expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/);
        expect(html).toContain('OGP確認イベントの日程調整');
    });

    test('PWAマニフェストとアイコン', async ({ request }) => {
        const manifest = await (await request.get('/manifest.json')).json();
        expect(manifest.display).toBe('standalone');
        for (const icon of manifest.icons) {
            expect((await request.get(icon.src)).ok()).toBeTruthy();
        }
        expect((await request.get('/sw.js')).ok()).toBeTruthy();
        expect((await request.get('/offline')).ok()).toBeTruthy();
    });
});
