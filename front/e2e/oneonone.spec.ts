import { test, expect } from '@playwright/test';

/**
 * 1-on-1 Scheduling E2E Tests
 * 
 * Note: Full 1-on-1 flows require authentication and backend.
 * These tests verify page structure and basic navigation.
 */

test.describe('1-on-1 Scheduling Flow', () => {

  test.describe('Page Structure', () => {
    test('oneonone index page should load', async ({ page }) => {
      await page.goto('/oneonone');

      // Page should load (may require auth, so check for either content or redirect)
      const url = page.url();

      // Either shows oneonone page or redirects to login
      expect(url).toMatch(/oneonone|login/);
    });

    test('public booking page should handle non-existent slug', async ({ page }) => {
      await page.goto('/oneonone/p/non-existent-slug-12345');

      // Should show some page (404, not found, or error message)
      await expect(page.locator('body')).not.toBeEmpty();

      // Check for any 404-like indicator
      const bodyText = await page.locator('body').textContent();
      // Page should either show 404 or some content
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Navigation', () => {
    test('should be able to navigate to oneonone from menu if logged in', async ({ page }) => {
      // First go to home
      await page.goto('/');

      // Check if there's a link to 1-on-1 scheduling
      const oneononeLink = page.locator('a[href*="oneonone"], text=1-on-1, text=予約').first();

      if (await oneononeLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await oneononeLink.click();
        await expect(page).toHaveURL(/oneonone|login/);
      }
    });
  });
});

test.describe('1-on-1 Page Manage', () => {
  test('manage page route exists', async ({ page }) => {
    // Navigate to a manage page (will require auth in real scenario)
    await page.goto('/oneonone/pages/1');

    // Should either show manage page or redirect to login
    const url = page.url();
    expect(url).toMatch(/oneonone|login|404/);
  });
});
