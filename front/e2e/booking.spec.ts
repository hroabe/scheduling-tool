import { expect, test } from '@playwright/test';

/**
 * 1-on-1 booking (RFC-0005 v2): create page -> e-mail verification (dev link) -> guest reserves -> cancel
 * The E2E API runs with DEBUG=True, so the verification link is also shown on the host page.
 */
test('1on1予約: 作成 → 認証 → ゲスト予約 → キャンセル → 再予約できる', async ({ page, browser }) => {
    await page.goto('/booking/new');
    await page.getByLabel('予約ページのタイトル').fill('E2E面談');
    await page.getByLabel('主催者名').fill('主催 花子');
    await page.getByLabel('主催者のメールアドレス').fill('host@example.com');

    // Pick the last selectable day of the visible month (next month if needed) and generate slots
    const calendar = page.getByTestId('slot-calendar');
    const days = calendar.locator('td:not([data-outside="true"]) button:not([disabled])');
    if ((await days.count()) < 2) await calendar.locator('.rdp-button_next').click();
    await days.last().click();
    await page.getByTestId('generate-slots').click();
    await expect(page.getByTestId('slot-count')).not.toHaveText(/^0/);

    await page.getByTestId('create-booking-submit').click();
    await page.waitForURL(/\/booking\/[a-z0-9-]+\/host/);
    const slug = page.url().match(/\/booking\/([a-z0-9-]+)\/host/)![1];
    expect(page.url()).not.toContain('token=');

    // Pending verification: guests cannot open the page yet
    await expect(page.getByTestId('verify-banner')).toBeVisible();
    const guest = await browser.newContext();
    const guestPage = await guest.newPage();
    await guestPage.goto(`/booking/${slug}`);
    await expect(guestPage.getByTestId('booking-unavailable')).toBeVisible();

    // Verify with the development link
    await page.getByRole('link', { name: '［開発環境］確認リンクを開く' }).click();
    await expect(page.getByTestId('verify-success')).toBeVisible();

    // Guest reserves the first slot
    await guestPage.reload();
    await guestPage.getByTestId('guest-slot').first().click();
    await guestPage.getByLabel('お名前').fill('ゲスト太郎');
    await guestPage.getByLabel('メールアドレス').fill('guest@example.com');
    await guestPage.getByRole('button', { name: 'この日時で予約する' }).click();
    await guestPage.waitForURL(`**/booking/${slug}/done**`);
    await expect(guestPage.getByRole('heading', { name: '予約が確定しました' })).toBeVisible();

    // Host sees the booking
    await page.goto(`/booking/${slug}/host`);
    await page.getByRole('tab', { name: /予約/ }).click();
    await expect(page.getByTestId('host-booking').filter({ hasText: 'ゲスト太郎' })).toBeVisible();

    // Guest cancels from the done page; the slot becomes available again
    await guestPage.getByTestId('cancel-booking').click();
    await guestPage.getByRole('alertdialog').getByRole('button', { name: '予約をキャンセルする' }).click();
    await expect(guestPage.getByTestId('booking-status')).toContainText('キャンセル');

    await guestPage.goto(`/booking/${slug}`);
    await guestPage.getByTestId('guest-slot').first().click();
    await guestPage.getByLabel('お名前').fill('ゲスト次郎');
    await guestPage.getByLabel('メールアドレス').fill('guest2@example.com');
    await guestPage.getByRole('button', { name: 'この日時で予約する' }).click();
    await guestPage.waitForURL(`**/booking/${slug}/done**`);
    await guest.close();
});

test('管理トークンが無いブラウザでは管理画面に入れない', async ({ page }) => {
    await page.goto('/booking/unknown-page-1234/host');
    await expect(page.getByTestId('host-no-token')).toBeVisible();
});
