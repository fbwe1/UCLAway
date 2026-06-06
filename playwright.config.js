import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 30000,
  retries: 0,
  globalSetup:    './tests/e2e/globalSetup.js',
  globalTeardown: './tests/e2e/globalTeardown.js',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});