import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * 
 * Note: These tests depend on backend API being available.
 * Some tests verify page structure even when backend is not available.
 */

test.describe('Authentication Flow', () => {

  test('register page should load correctly', async ({ page }) => {
    await page.goto('/register');

    // Page should display registration form
    await expect(page.locator('h1, h2').first()).toContainText(/Create Account|登録|Register/i);

    // Form fields should be present
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login page should load correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Login|ログイン/i, exact: true })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error on failed login', async ({ page, request }) => {
    // Create an isolated CI account so the real email-check API selects login.
    const username = `e2e_${Date.now()}`;
    const email = `${username}@example.test`;
    const password = 'E2e-Only-Valid-Password-739!';
    const created = await request.post('http://localhost:8000/api/v1/accounts/register/', {
      data: { username, email, password, password_confirm: password },
    });
    expect(created.status()).toBe(201);

    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await page.locator('input[type="password"]').fill('Wrong-password-739!');
    const rejected = page.waitForResponse(response =>
      response.url().endsWith('/api/v1/accounts/login/') && response.request().method() === 'POST');
    await page.locator('button[type="submit"]').click();
    expect((await rejected).status()).toBe(400);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });

  test('new email should navigate to register page', async ({ page }) => {
    const email = `new_${Date.now()}@example.test`;
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(`/register?email=${encodeURIComponent(email)}`);
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });

  test('login link should navigate to login page', async ({ page }) => {
    await page.goto('/register');

    await page.click('a:has-text("Login"), a:has-text("ログイン")');
    await expect(page).toHaveURL(/login/);
  });
});
