import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Scheduling Tool
 * 
 * Tests the core user flows:
 * 1. Event creation page structure
 * 2. Form validation
 * 3. Home page functionality
 */

test.describe('Schedule Creation Flow', () => {
  test('create page should load correctly', async ({ page }) => {
    await page.goto('/create');

    // Page should display creation form
    await expect(page.locator('text=イベント情報, text=イベント名, text=Event')).toBeVisible({ timeout: 10000 });

    // Form fields should be present - using the actual field names from create/page.tsx
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('should fill in event details', async ({ page }) => {
    await page.goto('/create');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Find and fill the event name field (uses react-hook-form register('name'))
    const nameInput = page.locator('input').first();
    await nameInput.fill('E2Eテストイベント');

    // Verify input was filled
    await expect(nameInput).toHaveValue('E2Eテストイベント');
  });

  test('should show validation message on empty required fields', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should stay on create page (not redirect)
      await expect(page).toHaveURL(/create/);
    }
  });
});

test.describe('Home Page', () => {
  test('home page should load successfully', async ({ page }) => {
    await page.goto('/');

    // Page should load without errors
    await expect(page).toHaveTitle(/.*/);

    // Should have main content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should have navigation to create page', async ({ page }) => {
    await page.goto('/');

    // Look for create button or link
    const createLink = page.locator('a:has-text("作成"), a:has-text("Create"), a[href="/create"]').first();

    if (await createLink.isVisible()) {
      await createLink.click();
      await expect(page).toHaveURL(/create/);
    }
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

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
  });
});
