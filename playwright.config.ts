import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/responsive',
  timeout: 30_000,
  workers: 3,
  expect: { timeout: 6_000 },
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'child-model-desktop',
      testMatch: /child-model\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'events-desktop',
      testMatch: /events\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'desktop-firefox',
      testMatch: /tablet-smoke\.spec\.ts/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'landscape-wide',
      testMatch: /tablet-smoke\.spec\.ts|relic-pool\.spec\.ts|potion-belt\.spec\.ts|layout-fit\.spec\.ts|math-cast-fit\.spec\.ts|zhuyin-cast-fit\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'tablet-landscape',
      testMatch: /tablet-smoke\.spec\.ts|math-cast-fit\.spec\.ts|zhuyin-cast-fit\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'short-landscape',
      testMatch: /math-cast-fit\.spec\.ts|zhuyin-cast-fit\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 600 } },
    },
    {
      name: 'phone-narrow',
      testMatch: /math-cast-fit\.spec\.ts|zhuyin-cast-fit\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 360, height: 740 },
        hasTouch: true,
      },
    },
    {
      name: 'tablet-portrait',
      testMatch: /tablet-smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'phone-portrait-chromium',
      testMatch: /phone-smoke\.spec\.ts|layout-fit\.spec\.ts/,
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 640 } },
    },
    {
      name: 'phone-landscape-chromium',
      testMatch: /phone-smoke\.spec\.ts|layout-fit\.spec\.ts|math-cast-fit\.spec\.ts|zhuyin-cast-fit\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 640, height: 360 },
        hasTouch: true,
      },
    },
    {
      name: 'phone-portrait-webkit',
      testMatch: /phone-smoke\.spec\.ts|layout-fit\.spec\.ts|math-cast-fit\.spec\.ts|zhuyin-cast-fit\.spec\.ts/,
      use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'phone-landscape-webkit',
      testMatch: /phone-smoke\.spec\.ts|layout-fit\.spec\.ts|math-cast-fit\.spec\.ts|zhuyin-cast-fit\.spec\.ts/,
      use: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } },
    },
    {
      name: 'phone-568x320',
      testMatch: /math-cast-fit\.spec\.ts|zhuyin-cast-fit\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 568, height: 320 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
