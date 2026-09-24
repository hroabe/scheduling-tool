import { expect, test } from '@playwright/test';
import { pickDays } from './helpers';

const unique = () => `e2e${Date.now()}${Math.floor(Math.random() * 1000)}`;

test('会員登録 → マイイベント → ログアウト → メールアドレスでログイン', async ({ page }) => {
    const name = unique();
    const email = `${name}@example.com`;
    const password = 'E2e-password-2026';

    await page.goto('/register');
    await page.locator('input[name="username"]').fill(name);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="password_confirm"]').fill(password);
    await page.getByRole('button', { name: '登録する' }).click();
    await page.waitForURL('**/account**');

    // A signed-in user's new event is owned by the account and listed in "My events"
    await page.goto('/create');
    await expect(page.getByTestId('signed-in-note')).toBeVisible();
    await page.getByRole('textbox', { name: 'イベント名' }).fill('アカウントのイベント');
    await pickDays(page, 1);
    await page.getByRole('button', { name: '作成（リンク画面へ）' }).click();
    await page.waitForURL(/\/event\/[0-9a-f-]{36}/);

    await page.goto('/account/events');
    await expect(page.getByTestId('event-item').filter({ hasText: 'アカウントのイベント' })).toBeVisible();

    // Log out: header account menu on desktop, drawer menu on mobile
    await page.goto('/');
    if (test.info().project.name === 'mobile') {
        await page.getByRole('button', { name: 'メニューを開く' }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'ログアウト' }).click();
    } else {
        await page.getByRole('button', { name: 'アカウントメニュー' }).click();
        await page.getByRole('menuitem', { name: 'ログアウト' }).click();
    }

    await page.goto('/account');
    await page.waitForURL('**/login**');

    await page.locator('input[name="username"]').fill(email.toUpperCase());
    await page.locator('input[name="password"]').fill(password);
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    await page.waitForURL('**/account**');
});

test('誤ったパスワードではログインできない', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="username"]').fill('nobody@example.com');
    await page.locator('input[name="password"]').fill('wrong-password');
    await page.getByRole('button', { name: 'ログイン', exact: true }).click();
    await expect(page.getByTestId('login-error')).toBeVisible();
});

test('カレンダー連携ページは未ログインならログインへ誘導する', async ({ page }) => {
    await page.goto('/account/integrations');
    await page.waitForURL(/\/login\?next=%2Faccount%2Fintegrations/);
});
