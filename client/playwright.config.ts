import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Global defaults for all projects
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
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
      testDir: 'tests/e2e',
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

