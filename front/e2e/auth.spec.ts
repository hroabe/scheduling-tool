import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {

  test('should register a new user successfully', async ({ page }) => {
    // Generate unique user
    const username = `testuser_${Date.now()}`;
    const email = `test_${Date.now()}@example.com`;

    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="password_confirm"]', 'Password123!');
    await page.fill('input[name="first_name"]', 'Test');
    await page.fill('input[name="last_name"]', 'User');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or home
    await expect(page).toHaveURL(/\/dashboard|^\/$/);

    // Should show welcome message or username
    await expect(page.locator('body')).toContainText(username);
  });

  test('should login successfully', async ({ page }) => {
    // Assuming a seed user exists or we register one first
    // For stable E2E, usually we register first in the same test or use API

    // Register first to ensure user exists
    const username = `loginuser_${Date.now()}`;
    await page.goto('/register');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', `${username}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="password_confirm"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard|^\/$/);

    // Logout (if implemented) or clear cookies
    await page.context().clearCookies();
    await page.goto('/login');

    // Login
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard|^\/$/);
  });

  test('should show validation error on failed login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Expect error message
    // Adjust selector based on actual UI
    await expect(page.locator('text=ログインに失敗しました|text=Invalid|role=alert')).toBeVisible();
  });

  test('protected route should redirect to login', async ({ page }) => {
    await page.goto('/dashboard'); // Assuming /dashboard is protected

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});
