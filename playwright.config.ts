import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:18573', ...devices['iPhone 13'], browserName: 'chromium', channel: 'chrome' },
  webServer: {
    command: 'npm run dev:h5 -- --port 18573',
    url: 'http://127.0.0.1:18573',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
