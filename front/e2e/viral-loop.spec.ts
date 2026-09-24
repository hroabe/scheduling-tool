import { expect, test } from '@playwright/test';
import { createEvent, respond } from './helpers';

test('回答完了後にCTAモーダルが表示される', async ({ page }) => {
    await createEvent(page, { days: 1 });
    await respond(page, '田中', ['参加可能']);
    const modal = page.getByTestId('response-success-modal');
    await expect(modal).toBeVisible();
    const cta = modal.getByRole('link', { name: 'イベントを作成する' });
    await expect(cta).toHaveAttribute('href', '/create?ref=response_cta');
    await cta.click();
    await page.waitForURL('**/create?ref=response_cta');
});

test('Powered byリンクがフッターにある', async ({ page }) => {
    await page.goto('/');
    const poweredBy = page.getByTestId('powered-by');
    await expect(poweredBy).toBeVisible();
    await expect(poweredBy).toHaveAttribute('href', '/?ref=powered_by');
});

test('refパラメータを初回流入として保存する', async ({ page }) => {
    await page.goto('/?ref=powered_by');
    await expect
        .poll(() => page.evaluate(() => localStorage.getItem('scheduling-tool-attribution')))
        .toContain('powered_by');
});
