import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run against a real Django API (port 8000) and a production Next.js build (port 3000).
 *
 *   npm run build && npx playwright test
 *
 * Set E2E_PYTHON to the Python interpreter that has the API requirements installed
 * (defaults to "python"). Set E2E_SKIP_SERVERS=1 to test already-running servers.
 */
const python = process.env.E2E_PYTHON || 'python';
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL,
        locale: 'ja-JP',
        timezoneId: 'Asia/Tokyo',
        trace: 'retain-on-failure',
        acceptDownloads: true,
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile', use: { ...devices['Pixel 7'] } },
    ],
    webServer: process.env.E2E_SKIP_SERVERS
        ? undefined
        : [
              {
                  command: `${python} manage.py migrate --noinput && ${python} manage.py runserver 127.0.0.1:8000 --noreload`,
                  cwd: '../api',
                  url: 'http://127.0.0.1:8000/api/health/',
                  reuseExistingServer: !process.env.CI,
                  timeout: 120_000,
                  env: {
                      DEBUG: 'True',
                      SECRET_KEY: 'django-insecure-e2e',
                      DATABASE_URL: 'sqlite:///e2e.sqlite3',
                      ALLOWED_HOSTS: 'localhost,127.0.0.1',
                      CORS_ALLOWED_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
                      FRONTEND_URL: 'http://localhost:3000',
                      THROTTLE_ANON_RATE: '100000/hour',
                      THROTTLE_EDIT_KEY_RATE: '100000/hour',
                  },
              },
              {
                  command: 'npm run start -- -p 3000',
                  url: 'http://localhost:3000',
                  reuseExistingServer: !process.env.CI,
                  timeout: 120_000,
              },
          ],
});
