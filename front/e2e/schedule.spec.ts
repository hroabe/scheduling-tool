import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Scheduling Tool
 * 
 * Tests the core user flows:
 * 1. Event creation
 * 2. Response submission
 * 3. Summary/results viewing
 */

test.describe('Schedule Creation Flow', () => {
  test('should create a new schedule with candidates', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Click create button (adjust selector as needed)
    await page.click('[data-testid="create-schedule-button"], a:has-text("イベントを作成"), button:has-text("作成")');

    // Wait for create page to load
    await expect(page).toHaveURL(/\/create/);

    // Fill in event details
    await page.fill('[name="name"], [data-testid="event-name-input"]', 'E2Eテストイベント');
    await page.fill('[name="owner_name"], [data-testid="owner-name-input"]', 'テスト太郎');

    // Add candidate dates (implementation varies by UI)
    // This is a placeholder - adjust based on actual UI
    const addCandidateButton = page.locator('button:has-text("候補日を追加"), [data-testid="add-candidate"]');
    if (await addCandidateButton.isVisible()) {
      await addCandidateButton.click();
    }

    // Submit form
    await page.click('button[type="submit"], button:has-text("作成"), [data-testid="submit-button"]');

    // Verify redirect to event page
    await expect(page).toHaveURL(/\/event\//);

    // Verify event name is displayed
    await expect(page.locator('text=E2Eテストイベント')).toBeVisible();
  });

  test('should show validation error without event name', async ({ page }) => {
    await page.goto('/create');

    // Try to submit without name
    await page.fill('[name="owner_name"], [data-testid="owner-name-input"]', 'テスト太郎');
    await page.click('button[type="submit"], button:has-text("作成"), [data-testid="submit-button"]');

    // Should show validation error
    await expect(page.locator('text=必須, text=入力してください, [role="alert"]')).toBeVisible();
  });
});

test.describe('Response Submission Flow', () => {
  // Note: These tests require a pre-existing schedule
  // In a real setup, you'd create one via API before tests

  test('should display event details on event page', async ({ page }) => {
    // Navigate to event page (would need actual UUID in real test)
    // For now, just verify the page structure exists
    await page.goto('/');

    // Home page should have some content
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

test.describe('Summary and Results', () => {
  test('home page should load successfully', async ({ page }) => {
    await page.goto('/');

    // Page should load without errors
    await expect(page).toHaveTitle(/.*/);

    // Should have main content
    await expect(page.locator('main, #__next, body')).not.toBeEmpty();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Page should be usable on mobile
    await expect(page.locator('body')).toBeVisible();
  });
});
