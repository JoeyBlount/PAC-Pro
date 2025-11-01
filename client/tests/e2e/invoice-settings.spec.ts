import { test, expect, chromium } from '@playwright/test';

test.describe('Invoice Settings Tests', () => {
  test('should edit account number for specific category and revert back', async () => {
    test.setTimeout(60000);

    const context = await chromium.launchPersistentContext('./.pw-invoice-settings-test-profile', {
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

    // 🔑 Force a fresh ID token so the app will attach Authorization header
    await page.evaluate(async () => {
      const anyWin = window as any;
      const auth = anyWin?.firebaseAuth || anyWin?.auth || anyWin?.firebase?.auth?.();
      const user = auth?.currentUser;
      if (user?.getIdToken) {
        await user.getIdToken(true); // force refresh
      }
    });

    // Navigate to settings page
    await page.goto('http://localhost:3000/navi/settings');
    await page.waitForURL(/.*settings.*/);

    // Click on Invoice Settings card
    await page.getByText('Invoice Settings').click();
    await page.waitForURL(/.*invoice-settings.*/);

    // Wait for invoice settings table to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Find the FOOD category row and get its original account number
    const foodRow = page.locator('tr').filter({ hasText: 'FOOD' });
    const originalAccountNumber = await foodRow.locator('td').nth(1).textContent();
    console.log('Original FOOD account number:', originalAccountNumber);

    // Click Edit button for FOOD category
    await foodRow.locator('button', { hasText: 'Edit' }).click();

    // Wait for input field to appear
    await foodRow.locator('input').waitFor({ state: 'visible' });

    // Clear and enter new account number
    await foodRow.locator('input').clear();
    await foodRow.locator('input').fill('9999');

    // Click Save button
    await foodRow.locator('button', { hasText: 'Save' }).click();

    // Wait for the update to complete
    await page.waitForTimeout(2000);

    // Verify the account number was updated
    const updatedAccountNumber = await foodRow.locator('td').nth(1).textContent();
    expect(updatedAccountNumber).toBe('9999');
    console.log('Updated FOOD account number:', updatedAccountNumber);

    // Now revert back to original number
    await foodRow.locator('button', { hasText: 'Edit' }).click();
    await foodRow.locator('input').waitFor({ state: 'visible' });
    await foodRow.locator('input').clear();
    await foodRow.locator('input').fill(originalAccountNumber || '0000');
    await foodRow.locator('button', { hasText: 'Save' }).click();

    // Wait for the revert to complete
    await page.waitForTimeout(2000);

    // Verify the account number was reverted back
    const revertedAccountNumber = await foodRow.locator('td').nth(1).textContent();
    expect(revertedAccountNumber).toBe(originalAccountNumber);
    console.log('Reverted FOOD account number:', revertedAccountNumber);

    // Verify the account number is back to original
    expect(revertedAccountNumber).toBe(originalAccountNumber);
  });
});

