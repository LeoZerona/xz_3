import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: 'http://127.0.0.1:18613' },
  webServer: { command: 'node scripts/serveBuiltH5.cjs 18613', url: 'http://127.0.0.1:18613', reuseExistingServer: false, timeout: 30000 },
})
