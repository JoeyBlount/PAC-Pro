// client/tests/setup/save-auth-state.spec.ts
import { test, expect, chromium } from '@playwright/test';

test('manual Google login then save storage state', async () => {
  const context = await chromium.launchPersistentContext('./.pw-auth-profile', {
    channel: 'chrome',                 // use real Chrome (or 'msedge')
    headless: false,
    // soften automation fingerprints
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await context.newPage();

  // go straight to your login page (adjust if it's different)
  await page.goto('http://localhost:3000');

  // do the Google login manually in the real browser window,
  // then click "Resume" in the Playwright inspector
  await page.pause();

  // Navigate to dashboard to ensure cookies are saved for the right path
  await page.goto('http://localhost:3000/navi/dashboard');

  // sanity check you're logged in: confirm dashboard URL and a stable dashboard element
  await expect(page).toHaveURL(/\/navi\/dashboard/);
  await expect(page.getByRole('heading', { name: /^Announcements$/i })).toBeVisible({ timeout: 15000 });

  // save cookies/session for reuse
  await context.storageState({ path: './auth.json' });
  await context.close();
});
