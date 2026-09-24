import { expect, type Page } from '@playwright/test';

export const EDIT_KEY = 'e2e-secret';

/** Click `count` future days in the create-page calendar (moves to next month if needed) */
export async function pickDays(page: Page, count: number) {
    const calendar = page.getByTestId('candidate-calendar');
    const enabledDays = calendar.locator('td:not([data-outside="true"]) button:not([disabled])');
    if ((await enabledDays.count()) < count + 1) {
        await calendar.locator('.rdp-button_next').click();
    }
    const total = await enabledDays.count();
    for (let i = 0; i < count; i++) {
        await enabledDays.nth(total - 1 - i).click();
    }
    await expect(page.getByTestId('candidate-item')).toHaveCount(count);
}

/** Create an event through the UI and return its uuid (lands on the event page) */
export async function createEvent(
    page: Page,
    { name = 'E2Eミーティング', owner = '山田太郎', days = 3, editKey = EDIT_KEY }: { name?: string; owner?: string; days?: number; editKey?: string | null } = {}
) {
    await page.goto('/create');
    await page.getByLabel('イベント名').fill(name);
    await page.getByLabel('あなたの名前').fill(owner);
    await pickDays(page, days);

    if (editKey) {
        await page.getByRole('button', { name: '詳細設定（任意）' }).click();
        await page.getByLabel('編集キー', { exact: true }).fill(editKey);
    }

    await page.getByRole('button', { name: 'イベントを作成する' }).click();
    await page.waitForURL(/\/event\/[0-9a-f-]{36}/);
    const uuid = page.url().match(/\/event\/([0-9a-f-]{36})/)![1];

    const createdModal = page.getByTestId('created-modal');
    await expect(createdModal).toBeVisible();
    await createdModal.getByRole('button', { name: 'OK' }).click();
    await expect(createdModal).toBeHidden();
    return uuid;
}

/** Answer every candidate with the given marks (cycled) */
export async function respond(page: Page, name: string, marks: ('参加可能' | '調整可能' | '参加不可')[]) {
    await page.getByRole('tab', { name: /回答する|自分の回答を編集/ }).click();
    await page.getByLabel('お名前').fill(name);
    const rows = page.getByTestId('response-candidate');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
        await rows.nth(i).getByRole('button', { name: new RegExp(`${marks[i % marks.length]}$`) }).click();
    }
    await page.getByRole('button', { name: /回答を(送信|更新)する/ }).click();
}
