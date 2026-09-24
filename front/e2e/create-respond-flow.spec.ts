import { expect, test } from '@playwright/test';
import { createEvent, respond } from './helpers';

test('イベント作成→URL共有→回答→集計確認', async ({ page }) => {
    // 1. /create でイベント作成  2. 生成されたURLに遷移
    const uuid = await createEvent(page, { name: '週次定例', days: 3 });
    await expect(page.getByRole('heading', { level: 1, name: '週次定例' })).toBeVisible();
    await expect(page.getByText('回答受付中')).toBeVisible();

    // 3. 回答フォームで回答送信
    await respond(page, '佐藤花子', ['参加可能', '調整可能', '参加不可']);

    // 4. 回答完了CTAモーダル表示確認
    const modal = page.getByTestId('response-success-modal');
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: '閉じる' }).click();

    // 5. 回答状況タブで回答が表示される
    const table = page.getByTestId('response-table');
    await expect(table.getByText('佐藤花子')).toBeVisible();
    await expect(table.getByText('あなた')).toBeVisible();

    // 6. 集計タブでおすすめバッジ確認
    await expect(table.getByTestId('recommended-badge')).toBeVisible();
    await page.getByRole('tab', { name: '集計結果' }).click();
    const first = page.getByTestId('summary-candidate').first();
    await expect(first.getByText('おすすめ')).toBeVisible();

    // 共有URLは誰でも開ける（別コンテキスト = 別ユーザー）
    const other = await page.context().browser()!.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto(`/event/${uuid}?utm_source=share&utm_medium=link`);
    await expect(otherPage.getByRole('heading', { level: 1, name: '週次定例' })).toBeVisible();
    await expect(otherPage.getByTestId('response-table').getByText('佐藤花子')).toBeVisible();
    await other.close();
});

test('自分の回答を後から編集できる', async ({ page }) => {
    await createEvent(page, { days: 2 });
    await respond(page, '鈴木', ['参加不可']);
    await page.getByTestId('response-success-modal').getByRole('button', { name: '閉じる' }).click();

    await expect(page.getByRole('tab', { name: '自分の回答を編集' })).toBeVisible();
    await respond(page, '鈴木', ['参加可能']);
    await expect(page.getByTestId('response-success-modal')).toContainText('回答を更新しました');
});

test('存在しないイベントは見つからない表示になる', async ({ page }) => {
    await page.goto('/event/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText('イベントが見つかりませんでした')).toBeVisible();
});
