import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/client', workers: 1, timeout: 30000,
  use: { baseURL: 'http://localhost:54621', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } },
  webServer: { command: 'node scripts/preview.mjs', port: 54621, reuseExistingServer: false },
});
