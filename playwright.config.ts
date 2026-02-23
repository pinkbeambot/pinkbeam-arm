import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E and visual regression testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directories
  testDir: './src/__tests__',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'on-first-retry',
  },

  // Configure projects for major browsers and viewports
  projects: [
    // Auth setup — runs first, saves session cookies for dependent projects
    {
      name: 'setup',
      testMatch: /e2e\/auth\.setup\.ts$/,
    },

    // E2E Tests (depend on auth setup)
    {
      name: 'e2e-chromium',
      testMatch: /e2e\/.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },

    // E2E Tests - Desktop Firefox
    {
      name: 'e2e-firefox',
      testMatch: /e2e\/.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },

    // Visual Regression Tests
    {
      name: 'visual-chromium',
      testMatch: /visual\/.*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'visual-chromium-mobile',
      testMatch: /visual\/.*\.spec\.ts$/,
      use: {
        ...devices['iPhone 14'],
      },
    },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
});
