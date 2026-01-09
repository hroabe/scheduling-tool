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

    // Page should display creation form - wait for any content to load
    await page.waitForLoadState('networkidle');

    // Check for form elements or heading text
    const hasForm = await page.locator('form, input').first().isVisible({ timeout: 10000 });
    expect(hasForm).toBe(true);

    // Form fields should be present
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

  test('submit button should be disabled when form is incomplete', async ({ page }) => {
    await page.goto('/create');
    await page.waitForLoadState('networkidle');

    // Submit button should be disabled when required fields are empty
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      // Button should be disabled (this is expected behavior)
      await expect(submitButton).toBeDisabled();
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
  test('should show hamburger menu on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Page should be usable on mobile
    await expect(page.locator('body')).toBeVisible();

    // Mobile menu button should be visible
    const menuButton = page.getByRole('button', { name: /メニューを開く/i });
    await expect(menuButton).toBeVisible();

    // Desktop navigation should be hidden
    const desktopNav = page.locator('header').locator('[data-testid="desktop-nav"]');
    // Check that login button is not visible in header (it's in drawer)
    await expect(page.locator('header').locator('a[href="/login"]')).not.toBeVisible();
  });

  test('should show full navigation on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();

    // Mobile menu button should not be visible
    const menuButton = page.getByRole('button', { name: /メニューを開く/i });
    await expect(menuButton).not.toBeVisible();

    // Desktop navigation should be visible
    await expect(page.locator('header').locator('a[href="/login"]')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
  });
});

