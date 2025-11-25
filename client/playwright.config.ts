import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Global defaults for all projects
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['./test-reporter.ts']],
  use: {
    headless: true,
    channel: 'chrome',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'setup',
      testDir: 'tests/setup',
      // Only run the auth-state saver
      testMatch: /save-auth-state\.spec\.ts$/,
      workers: 1,
      use: {
        headless: true,
        channel: 'chrome',
      },
    },
    {
      name: 'e2e',
      testMatch: ['tests/e2e/**/*.spec.ts'],
      // Ensure setup runs first to refresh auth.json
      dependencies: ['setup'],
      workers: 1,
      use: {
        storageState: './auth.json',
        headless: true,
        channel: 'chrome',
      },
    },
  ],
});

