import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  reporter: 'list', timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 }, trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS || '["--no-sandbox","--disable-dev-shm-usage"]') } : {} },
  webServer: { command: 'npm run preview -- --host 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }
});
