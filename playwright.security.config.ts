import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/security-e2e',
  timeout: 30_000,
  expect: { timeout: 6_000 },
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4174/zhuyin-spire/',
    viewport: { width: 1024, height: 768 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/zhuyin-spire/',
    reuseExistingServer: false,
  },
});
