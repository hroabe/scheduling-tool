import { expect, test, type Page } from '@playwright/test';

// Header menus are lazy-loaded; on narrow viewports they live in the drawer (md breakpoint = 768px)
async function openMenusIfMobile(page: Page) {
    if ((page.viewportSize()?.width ?? 1280) < 768) {
        await page.getByRole('button', { name: 'メニューを開く' }).click();
    }
}

test('サーバー描画のHTMLに翻訳キーが出ない（SEO）', async ({ request }) => {
    for (const path of ['/', '/create', '/faq', '/booking/new', '/login', '/privacy', '/terms']) {
        const html = await (await request.get(path)).text();
        // raw keys look like "home.heroTitle" / "create.eventName" inside text nodes
        expect(html, path).not.toMatch(/>(home|create|faq|legal|booking|auth|header|footer|event|common)\.[a-zA-Z_.]+</);
    }
});

test('言語を英語に切り替えると表示とhtml langが変わり、再訪時も維持される', async ({ page }) => {
    await page.goto('/');
    await openMenusIfMobile(page);
    await page.getByRole('button', { name: /^言語:/ }).first().click();
    await page.getByRole('menuitemradio', { name: 'English' }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/create');
    await expect(page.getByRole('textbox', { name: 'Event name' })).toBeVisible();
});

test('かわいいモードに切り替えると出欠記号が顔文字になる', async ({ page }) => {
    await page.goto('/');
    await openMenusIfMobile(page);
    await page.getByRole('button', { name: 'テーマ切り替え' }).first().click();
    await page.getByRole('menuitemradio', { name: /かわいい/ }).click();
    await expect(page.getByText('😊').first()).toBeVisible();
});
