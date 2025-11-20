import { test, expect } from '@playwright/test';

test.use({ storageState: './auth.json' });
test.use({ headless: false, channel: 'chrome' });

test.describe('Submit Invoice', () => {
  test('Submit a invoice with all required fields', async ({ page }, testInfo) => {
    test.setTimeout(60000);

    // Login using saved state (click Google if still on login)
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    const googleBtn = page.getByRole('button', { name: /^Login with Google$/i });
    if (await googleBtn.isVisible().catch(() => false)) {
      await googleBtn.click();
    }
    await page.waitForURL(/\/navi\/dashboard/i, { timeout: 45_000 }).catch(() => {});

    // 🔑 Force a fresh ID token so the app will attach Authorization header
    await page.evaluate(async () => {
      // Try modular (v9) first
      const anyWin = window as any;
      const auth = anyWin?.firebaseAuth || anyWin?.auth || anyWin?.firebase?.auth?.();
      const user = auth?.currentUser;
      if (user?.getIdToken) {
        await user.getIdToken(true); // force refresh
      }
    });
    
    // Go to submit invoice
    await page.goto('http://localhost:3000/navi/submitinvoice');
    await expect(page).toHaveTitle(/PAC Pro - Submit Invoice/i);

    // Set Month/Year
    await page.getByTestId('month-select').click();
    await page.getByRole('option', { name: 'December' }).click();

    await page.getByPlaceholder('Enter Invoice Number').fill('playwrightInvoiceTest');
    await page.getByPlaceholder('Enter Company Name').fill('playwrightTestCo');

    await page.getByRole('button', { name: '+ Add New Amount' }).click();
    await page.locator('select').first().selectOption('FOOD');
    await page.locator('input[placeholder="Amount"]').first().fill('1351');
    await page.getByRole('button', { name: 'Confirm' }).first().click();

    // Attach file (required)
    await page.locator('input[type="file"]').setInputFiles('./tests/e2e/playwright_file.png');

    let messages: string[] = [];
    page.on('dialog', async d => {
      messages.push(`${d.type()}: ${d.message()}`);
      await d.accept();
    });
    
    // Click submit
    await page.getByTestId('submit-invoice-btn').click();
    
    // Wait for *any* dialog
    await expect.poll(() => messages.length, { timeout: 30_000 }).toBeGreaterThan(0);
    
    // Assert the success message appeared
    expect(messages).toContain('alert: Invoice submitted successfully!');

    // Navigate to Invoice Logs page
    const navLink = page.getByRole('link', { name: /Invoice Log/i }).first();
    if (await navLink.isVisible().catch(() => false)) {
      await navLink.click();
    } else {
      await page.goto('http://localhost:3000/navi/invoicelogs');
    }
    await expect(page).toHaveTitle(/PAC Pro - Invoice Logs/i);

    // Helpers for Invoice Logs
    function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    async function setLogsMonthYear(monthLabel: string, yearLabel?: string) {
      // Scope to the page's filter area to avoid the navbar Store select
      const filters = page.locator('.filterDropdowns');
      const monthTrigger = filters.locator('[aria-haspopup="listbox"]').nth(0);
      await monthTrigger.click();
      await page.getByRole('option', { name: new RegExp(`^${esc(monthLabel)}$`, 'i') }).click();
      await expect(page.locator('[role="listbox"]')).toBeHidden({ timeout: 5000 }).catch(() => {});
      if (yearLabel) {
        const yearTrigger = filters.locator('[aria-haspopup="listbox"]').nth(1);
        await yearTrigger.click();
        await page.getByRole('option', { name: new RegExp(`^${esc(yearLabel)}$`, 'i') }).click();
        await expect(page.locator('[role="listbox"]')).toBeHidden({ timeout: 5000 }).catch(() => {});
      }
    }

    const rowByInvoiceNumber = (invNum: string) =>
      page
        .locator('table').first()
        .locator('tbody tr')
        .filter({ has: page.locator('td').filter({ hasText: new RegExp(`^${invNum}$`, 'i') }) })
        .first();

    // Filter to December of current year and find the submitted invoice
    const currentYear = String(new Date().getFullYear());
    await setLogsMonthYear('December', currentYear);
    const originalInvNum = 'playwrightInvoiceTest';
    const row = rowByInvoiceNumber(originalInvNum);
    await expect(row).toBeVisible({ timeout: 15000 });

    // Open Edit dialog
    const editBtn = row.getByRole('button', { name: /Edit/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    const editDialog = page.getByRole('dialog', { name: /Edit Invoice/i });
    await expect(editDialog).toBeVisible({ timeout: 10000 });

    // Change fields slightly, including month/year to Jan 2024
    const newCompany = 'playwrightTestCo-Edited';
    const newInvNum = 'playwrightInvoiceTest-Edited';
    await editDialog.locator('input[name="companyName"]').fill(newCompany);
    await editDialog.locator('input[name="invoiceNumber"]').fill(newInvNum);
    await editDialog.locator('select[name="targetMonth"]').selectOption('1'); // January
    await editDialog.locator('select[name="targetYear"]').selectOption('2024');
    // Adjust FOOD amount if present
    const foodInput = editDialog.locator('input[name="FOOD"]');
    if (await foodInput.isVisible().catch(() => false)) {
      await foodInput.fill('1352');
    }

    // Save changes
    await editDialog.getByRole('button', { name: /Save Changes/i }).click();
    // Wait for success alert (handled by page.on('dialog')) and dialog close
    await expect(editDialog).toBeHidden({ timeout: 15000 });

    // Re-filter to January 2024 and verify updated invoice present
    await setLogsMonthYear('January', '2024');
    await expect(rowByInvoiceNumber(newInvNum)).toBeVisible({ timeout: 15000 });

    // Lock, verify toggle to Unlock, then unlock
    {
      const rowJan = rowByInvoiceNumber(newInvNum);
      const lockBtn = rowJan.locator('button.lock-toggle-button').first();
      await expect(lockBtn).toBeVisible({ timeout: 10000 });
      const initial = (await lockBtn.innerText()).trim();
      if (/^.*Lock$/.test(initial) && !/Unlock/i.test(initial)) {
        await lockBtn.click();
        await expect(lockBtn).toHaveText(/Unlock/i, { timeout: 15000 });
        // Allow backend to persist the locked state
        await page.waitForTimeout(1000);
      }
      await lockBtn.click();
      await expect(lockBtn).toHaveText(/Lock/i, { timeout: 15000 });
      // Allow backend to persist the unlocked state
      await page.waitForTimeout(1000);
    }

    // Delete the invoice (confirm + success alert handled by dialog handler), verify it disappears
    {
      const rowJan = rowByInvoiceNumber(newInvNum);
      const deleteBtn = rowJan.locator('button.delete-button').first();
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      await expect(rowByInvoiceNumber(newInvNum)).toHaveCount(0, { timeout: 20000 });
      // Give backend a moment to move it into Recently Deleted collection
      await page.waitForTimeout(1200);
    }

    // Open Recently Deleted, find the invoice by number (with refresh retries), restore it
    async function openRecentlyDeleted() {
      await page.getByRole('button', { name: /^Recently Deleted$/i }).click();
      await expect(page.getByRole('heading', { name: /Recently Deleted/i })).toBeVisible({ timeout: 10000 });
    }

    async function findDeletedItemWithRefresh(invNum: string) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const item = page.locator('div').filter({ hasText: new RegExp(`Invoice #${esc(invNum)}`, 'i') }).last();
        if (await item.isVisible().catch(() => false)) return item;
        // Refresh the list by closing and reopening
        const closeBtn = page.getByRole('button', { name: /^Close$/i });
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
        await page.waitForTimeout(800);
        await openRecentlyDeleted();
      }
      return page.locator('div').filter({ hasText: new RegExp(`Invoice #${esc(invNum)}`, 'i') }).last();
    }

    await openRecentlyDeleted();
    await expect(page.getByRole('heading', { name: /Recently Deleted/i })).toBeVisible({ timeout: 10000 });
    const deletedItem = await findDeletedItemWithRefresh(newInvNum);
    // Climb to the nearest ancestor that contains a Restore button, then click that button
    const rowContainer = deletedItem.locator('xpath=ancestor-or-self::*[.//button[contains(normalize-space(.), "RESTORE") or contains(normalize-space(.), "Restore")]][1]');
    let restoreBtn = rowContainer.getByRole('button', { name: /^Restore$/i }).first();
    if (!(await restoreBtn.isVisible().catch(() => false))) {
      // Fallback: find by tag + text under the same container
      restoreBtn = rowContainer.locator('button').filter({ hasText: /^Restore$/i }).first();
    }
    await expect(restoreBtn).toBeVisible({ timeout: 10000 });
    await restoreBtn.click({ timeout: 10000 }).catch(async () => {
      await restoreBtn.click({ force: true, timeout: 10000 });
    });
    // Wait for the item to disappear from the list after restore
    await expect(rowContainer).toBeHidden({ timeout: 15000 }).catch(() => {});

    // Close the Recently Deleted overlay
    await page.getByRole('button', { name: /^Close$/i }).click();

    // Verify invoice reappears in Jan 2024 filter
    await setLogsMonthYear('January', '2024');
    await expect(rowByInvoiceNumber(newInvNum)).toBeVisible({ timeout: 20000 });

    // Final: delete again, then permanently delete from Recently Deleted, verify it's gone
    {
      const rowJan = rowByInvoiceNumber(newInvNum);
      const deleteBtn = rowJan.locator('button.delete-button').first();
      await expect(deleteBtn).toBeVisible({ timeout: 10000 });
      await deleteBtn.click();
      await expect(rowByInvoiceNumber(newInvNum)).toHaveCount(0, { timeout: 20000 });
      await page.waitForTimeout(1200);

      // Open Recently Deleted
      await openRecentlyDeleted();
      await expect(page.getByRole('heading', { name: /Recently Deleted/i })).toBeVisible({ timeout: 10000 });

      // Find the specific item and click Delete Permanently
      const delItem = await findDeletedItemWithRefresh(newInvNum);
      const delRow = delItem.locator('xpath=ancestor-or-self::*[.//button[contains(normalize-space(.), "DELETE PERMANENTLY") or contains(normalize-space(.), "Delete Permanently")]][1]');
      let permaBtn = delRow.getByRole('button', { name: /^Delete Permanently$/i }).first();
      if (!(await permaBtn.isVisible().catch(() => false))) {
        permaBtn = delRow.locator('button').filter({ hasText: /^Delete Permanently$/i }).first();
      }
      await expect(permaBtn).toBeVisible({ timeout: 10000 });
      await permaBtn.click({ timeout: 10000 }).catch(async () => {
        await permaBtn.click({ force: true, timeout: 10000 });
      });

      // Close the overlay and confirm it's gone from logs after refresh
      await page.getByRole('button', { name: /^Close$/i }).click();
      await page.reload();
      await setLogsMonthYear('January', '2024');
      await expect(rowByInvoiceNumber(newInvNum)).toHaveCount(0, { timeout: 20000 });
    }

  });
});
