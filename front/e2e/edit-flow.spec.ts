import { expect, test } from '@playwright/test';
import { createEvent, EDIT_KEY, pickDays } from './helpers';

test('edit_key認証→イベント編集→候補日追加→日程確定', async ({ browser }) => {
    // 1. イベント作成（edit_key付き）
    const owner = await browser.newContext();
    const ownerPage = await owner.newPage();
    const uuid = await createEvent(ownerPage, { name: '編集前の名前', days: 2 });
    await owner.close();

    // 2. 別タブ（キー未保持）で /event/{uuid}/edit に遷移
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/event/${uuid}/edit`);

    // 3. edit_key入力→認証（誤ったキーはエラー）
    const modal = page.getByTestId('edit-key-modal');
    await expect(modal).toBeVisible();
    await modal.getByLabel('編集キー').fill('wrong-key');
    await modal.getByRole('button', { name: '認証' }).click();
    await expect(modal.getByText('編集キーが正しくありません')).toBeVisible();
    await modal.getByLabel('編集キー').fill(EDIT_KEY);
    await modal.getByRole('button', { name: '認証' }).click();
    await expect(modal).toBeHidden();

    // 4. イベント名変更→保存
    await page.getByLabel('イベント名').fill('編集後の名前');
    await page.getByRole('button', { name: '変更を保存' }).click();
    await expect(page.getByText('変更を保存しました').first()).toBeVisible();

    // 5. 候補日追加
    await expect(page.getByTestId('manage-candidate')).toHaveCount(2);
    const future = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
    const iso = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
    await page.getByLabel('日付').fill(iso);
    await page.getByRole('button', { name: '追加', exact: true }).click();
    await expect(page.getByTestId('manage-candidate')).toHaveCount(3);

    // 6. 日程確定
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: '日程を確定する' }).click();
    await expect(page.getByText(/確定済み:/)).toBeVisible();

    // イベントページに反映されている
    await page.getByRole('link', { name: 'イベントページに戻る' }).click();
    await expect(page.getByRole('heading', { level: 1, name: '編集後の名前' })).toBeVisible();
    await expect(page.getByTestId('finalized-alert')).toBeVisible();
    await expect(page.getByRole('link', { name: /Googleカレンダーに登録/ })).toHaveAttribute('href', /calendar\.google\.com/);
    await context.close();
});

test('作成者は同じタブで編集キーを再入力せずに編集できる／イベント削除', async ({ page }) => {
    const uuid = await createEvent(page, { name: '削除テスト', days: 1, editKey: null });
    await page.getByTestId('edit-link').click();
    await page.waitForURL(`**/event/${uuid}/edit`);
    await expect(page.getByTestId('edit-key-modal')).toBeHidden();

    await page.getByRole('button', { name: 'イベントを削除する' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: '削除する' }).click();
    await page.waitForURL((url) => url.pathname === '/');

    await page.goto(`/event/${uuid}`);
    await expect(page.getByText('イベントが見つかりませんでした')).toBeVisible();
});

test('候補日を選ばずに作成しようとするとエラー', async ({ page }) => {
    await page.goto('/create');
    await page.getByLabel('イベント名').fill('x');
    await page.getByLabel('あなたの名前').fill('y');
    await page.getByRole('button', { name: 'イベントを作成する' }).click();
    await expect(page.getByText('候補日を1つ以上選択してください')).toBeVisible();
    await pickDays(page, 1);
    await expect(page.getByText('候補日を1つ以上選択してください')).toBeHidden();
});
