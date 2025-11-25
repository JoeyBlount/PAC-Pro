import { test, expect } from '@playwright/test';
test.use({ storageState: './auth.json' });
test.use({ headless: true, channel: 'chrome' });

test.describe('Invoice Settings', () => {
  test('Edit account number for specific category and revert back', async ({ page }, testInfo) => {
    test.setTimeout(60000);

    await page.goto('http://localhost:3000');
    const googleBtn = page.getByRole('button', { name: /^Login with Google$/i });
    if (await googleBtn.isVisible().catch(() => false)) {
      await googleBtn.click();
    }
    // Land on dashboard
    await page.waitForURL(/\/navi\/dashboard.*/);

    // 🔑 Force a fresh ID token so the app will attach Authorization header
    await page.evaluate(async () => {
      const anyWin = window as any;
      const auth = anyWin?.firebaseAuth || anyWin?.auth || anyWin?.firebase?.auth?.();
      const user = auth?.currentUser;
      if (user?.getIdToken) {
        await user.getIdToken(true); // force refresh
      }
    });

    // Navigate directly to invoice settings
    await page.goto('http://localhost:3000/navi/settings/invoice-settings');
    await expect(page).toHaveURL(/\/navi\/settings\/invoice-settings/i, { timeout: 15000 });

    // Wait for invoice settings table to load
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(table.locator('tbody')).toBeVisible({ timeout: 10000 });

    // Find the FOOD category row and get its original account number
    const foodRow = () =>
      table
        .locator('tbody tr')
        .filter({ has: page.locator('td').nth(0).filter({ hasText: /^FOOD$/i }) })
        .first();
    const accountCell = () => foodRow().locator('td').nth(1);
    const editInput = () => foodRow().locator('input');

    await expect(foodRow()).toBeVisible({ timeout: 10000 });
    const originalAccountNumberRaw = (await accountCell().textContent()) || '';
    const originalAccountNumber = originalAccountNumberRaw.trim();
    //console.log('Original FOOD account number:', originalAccountNumber);

    const targetNewValue = originalAccountNumber === '9999' ? '9998' : '9999';

    // Click Edit button for FOOD category
    await foodRow().locator('button', { hasText: 'Edit' }).click();

    // Wait for input field to appear
    await editInput().waitFor({ state: 'visible' });

    // Clear and enter new account number (robust: select all + delete)
    await editInput().click();
    await editInput().press('Control+A').catch(() => {});
    await editInput().press('Delete').catch(() => {});
    await editInput().type(targetNewValue);
    // Blur the input to ensure change is registered by the UI
    await page.mouse.click(0, 0);
    await page.waitForTimeout(150);

    // Click Save button
    // Prepare to observe backend update call
    const id = 'FOOD';
    const updateUrlRegex = new RegExp(`/api/pac/invoice-settings/category/${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`, 'i');
    const waitUpdate = page.waitForResponse(resp => {
      try {
        return updateUrlRegex.test(new URL(resp.url()).pathname);
      } catch {
        return false;
      }
    }, { timeout: 15000 }).catch(() => null);

    await foodRow().locator('button', { hasText: 'Save' }).click();

    // Ensure backend accepted the change; if not, surface details
    const updateResp = await waitUpdate;
    if (!updateResp) {
      throw new Error('Timed out waiting for invoice-settings update request.');
    }
    if (!updateResp.ok()) {
      const bodyText = await updateResp.text().catch(() => '');
      throw new Error(`Invoice-settings update rejected: HTTP ${updateResp.status()} ${updateResp.statusText()} Body: ${bodyText}`);
    }

    // Verify the account number was updated (wait for cell text)
    // Verify persistence after reload (some UIs only reflect changes after re-fetch)
    await page.reload();
    await expect(table).toBeVisible({ timeout: 15000 });
    await expect(table.locator('tbody')).toBeVisible({ timeout: 15000 });
    await expect(accountCell()).toHaveText(targetNewValue, { timeout: 10000 });

    // Now revert back to original number
    await foodRow().locator('button', { hasText: 'Edit' }).click();
    await editInput().waitFor({ state: 'visible' });
    await editInput().click();
    await editInput().press('Control+A').catch(() => {});
    await editInput().press('Delete').catch(() => {});
    await editInput().type(originalAccountNumber || '0000');
    await foodRow().locator('button', { hasText: 'Save' }).click();

    // Verify the account number was reverted back
    await expect(accountCell()).toHaveText(originalAccountNumber, { timeout: 10000 });
    //console.log('Reverted FOOD account number:', await accountCell().textContent());

    // Re-check after reload
    await page.reload();
    await expect(table).toBeVisible({ timeout: 10000 });
    await expect(table.locator('tbody')).toBeVisible({ timeout: 10000 });
    await expect(accountCell()).toHaveText(originalAccountNumber, { timeout: 10000 });

  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const safeTitle = testInfo.title.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
      const filePath = require('path').join(testInfo.outputDir, `${safeTitle}-${testInfo.status || 'failed'}.png`);
      await page.screenshot({ path: filePath, fullPage: true }).catch(() => {});
    }
  });
});

