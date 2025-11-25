import { test, expect } from '@playwright/test';
import path from 'path';
test.use({ storageState: './auth.json' });
test.use({ headless: true, channel: 'chrome' });

test.describe('Announcement Management',  () => {
  test('Manage announcements by adding and removing', async ({ page }, testInfo) => {
    test.setTimeout(60000);

    await page.goto('http://localhost:3000');
    const googleBtn = page.getByRole('button', { name: /^Login with Google$/i });
    if (await googleBtn.isVisible().catch(() => false)) {
      await googleBtn.click();
    }
    // Land on dashboard
    await page.waitForURL(/\/navi\/dashboard.*/);

    await page.evaluate(async () => {
      // Try modular (v9) first
      const anyWin = window as any;
      const auth = anyWin?.firebaseAuth || anyWin?.auth || anyWin?.firebase?.auth?.();
      const user = auth?.currentUser;
      if (user?.getIdToken) {
        await user.getIdToken(true); // force refresh
      }
    });

    try {
      // Open announcement management (prefer direct Manage button; fallback to prior flow)
      const manageBtn = page.getByRole('button', { name: /^Manage$/i });
      if (await manageBtn.isVisible().catch(() => false)) {
        await manageBtn.click();
      } else {
        const possibleOpenBtn = page.getByRole('button').nth(1);
        if (await possibleOpenBtn.isVisible().catch(() => false)) {
          await possibleOpenBtn.click();
        }
        await page.getByRole('button', { name: /^Manage$/i }).click();
      }

      // Scope to the Manage Announcements dialog
      const dialog = page.getByRole('dialog', { name: /Manage Announcements/i });
      await expect(dialog).toBeVisible({ timeout: 10000 });

      // Add new announcement with a unique title to avoid collisions
      const unique = Date.now();
      const title = `Playwright Announcement ${unique}`;
      const message = `Automated message ${unique}`;
      await dialog.getByRole('textbox', { name: /Title/i }).fill(title);
      await dialog.getByRole('textbox', { name: /Message/i }).fill(message);

      const audience = dialog.getByRole('combobox').first();
      if (await audience.isVisible().catch(() => false)) {
        await audience.click();
        await page.getByRole('option', { name: /^Admin$/i }).click();
      }
      await dialog.getByRole('button', { name: /^Add$/i }).click();

      // Helper to escape regex special chars
      const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Wait until the new announcement appears in the list (avoid exact-equality to allow extra text lines)
      const listItem = dialog.locator('li').filter({ hasText: new RegExp(`${esc(title)}\\s*\\(Admin\\)`, 'i') }).first();
      await expect
        .poll(async () => await listItem.count(), { timeout: 10000 })
        .toBeGreaterThan(0);
      
      // Delete new announcement
      const deleteBtn = listItem.getByRole('button').first();
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      
      // Check if announcement was deleted
      await expect(listItem).toHaveCount(0, { timeout: 10000 });

      // Close out dialog
      const closeBtn = dialog.getByRole('button', { name: /^Close$/i }).first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await expect(dialog).toBeHidden({ timeout: 10000 }).catch(() => {});
      }
    } catch (err) {
      const shotPath = path.join(testInfo.outputDir, 'announcements-failure.png');
      await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
      throw new Error(`Announcements e2e failed. Screenshot: ${shotPath}\n${(err as Error).stack || err}`);
    }
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const safeTitle = testInfo.title.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
      const filePath = path.join(testInfo.outputDir, `${safeTitle}-${testInfo.status || 'failed'}.png`);
      await page.screenshot({ path: filePath, fullPage: true }).catch(() => {});
    }
  });
});