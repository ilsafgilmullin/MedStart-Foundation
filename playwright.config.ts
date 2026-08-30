import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './scripts/browser-smoke',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'android-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'pnpm --filter @workspace/medstart start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
