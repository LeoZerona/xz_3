import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 2,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  use: { baseURL: 'http://127.0.0.1:18573', ...devices['iPhone 13'], browserName: 'chromium', channel: 'chrome',actionTimeout:30_000 },
  webServer: {
    command: 'pnpm dev:h5 --port 18573',
    url: 'http://127.0.0.1:18573',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
