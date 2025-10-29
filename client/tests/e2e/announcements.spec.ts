import { test, expect, chromium } from '@playwright/test';

test.describe('Announcement Management',  () => {
  test('Should be able to add and remove announcements', async ({}, testInfo) => {
    test.setTimeout(60000);
      
    const context = await chromium.launchPersistentContext('./.pw-announcements-test-profile', {
      channel: 'chrome',
      headless: false,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const page = await context.newPage();

    await page.goto('http://localhost:3000');
    await expect(page.getByText('Sign In')).toBeVisible();

    // Google login (manual in headed mode)
    await page.pause(); // complete login manually

    // Land on dashboard
    await page.waitForURL(/.*dashboard.*/);

    await page.evaluate(async () => {
      // Try modular (v9) first
      const anyWin = window as any;
      const auth = anyWin?.firebaseAuth || anyWin?.auth || anyWin?.firebase?.auth?.();
      const user = auth?.currentUser;
      if (user?.getIdToken) {
        await user.getIdToken(true); // force refresh
      }
    });

    // Open announcement dialog
    await page.getByRole('button').nth(1).click();

    // Open announcement management
    await page.getByRole('button', { name: 'Manage' }).click();
    

    // Add new announcement
    await page.getByRole('textbox', { name: 'Title' }).click();
    await page.getByRole('textbox', { name: 'Title' }).fill('New Announcement Title');
    await page.getByRole('textbox', { name: 'Message' }).click();
    await page.getByRole('textbox', { name: 'Message' }).fill('New Announcement Message');
    await page.getByRole('combobox', { name: 'Visible To All' }).click();
    await page.getByRole('option', { name: 'Admin' }).click();
    await page.getByRole('button', { name: 'Add' }).click();

    const listItem = page.locator('li', { hasText: 'New Announcement Title (Admin)' });

    // Check if announcement was added
    await expect(listItem).toBeVisible();
    
    // Delete new announcement
    const button = page.locator('li', { hasText: 'New Announcement Title (Admin)' }).getByRole('button');
    await expect(button).toBeVisible(); // waits for button to appear
    await button.click();
    
    // Check if announcement was deleted
    await expect(listItem).not.toBeVisible();

    // Close out dialog
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
  });
});