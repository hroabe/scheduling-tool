import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createEvent, respond } from './helpers';

test.beforeEach(async ({ page }) => {
    await createEvent(page, { name: 'エクスポート確認', days: 2 });
    await respond(page, '=cmd|', ['参加可能', '参加不可']);
    await page.getByTestId('response-success-modal').getByRole('button', { name: '閉じる' }).click();
});

test('CSV出力のダウンロード', async ({ page }) => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-csv').click()]);
    expect(download.suggestedFilename()).toBe('エクスポート確認.csv');
    const content = await readFile((await download.path())!, 'utf-8');
    expect(content.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
    expect(content).toContain('参加者');
    expect(content).toContain("'=cmd|"); // CSV injection neutralised
    expect(content).toContain('集計');
});

test('ICS出力のダウンロード', async ({ page }) => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-ics').click()]);
    expect(download.suggestedFilename()).toBe('エクスポート確認.ics');
    const content = await readFile((await download.path())!, 'utf-8');
    expect(content).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(content).toContain('STATUS:TENTATIVE');
});
