import { test, expect, chromium } from '@playwright/test';

test.describe('Store Management – add, modify, and delete Test store', () => {
  test('cleans old data, adds Test store, modifies to "Modified", and deletes it', async () => {
    test.setTimeout(120_000);

    const context = await chromium.launchPersistentContext('./.pw-storemgmt-test-profile', {
      channel: 'chrome',
      headless: false,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled'],
    });
    const page = await context.newPage();

    // Prompts user to log in.
    await page.goto('http://localhost:3000');
    await expect(page.getByText(/Sign In/i)).toBeVisible();
    await page.pause(); // perform Google login manually once
    await page.waitForURL(/.*dashboard.*/);

    await page.evaluate(async () => {
      const anyWin = window;
      const auth = anyWin?.firebaseAuth || anyWin?.auth || anyWin?.firebase?.auth?.();
      const user = auth?.currentUser;
      if (user?.getIdToken) await user.getIdToken(true);
    });

    //Navigate to the Store Management page.
    await page.goto('http://localhost:3000/navi/settings/store-management');

    if (await page.getByText(/view-only mode/i).isVisible().catch(() => false)) {
      test.skip(true, 'Accountant role: view-only, cannot modify.');
    }

    //Constants.
    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December',
    ];
    const currentMonth = months[new Date().getMonth()]; //Gets current month for test store.

    //Test store information.
    const storeName = 'Test';
    const modifiedName = 'Modified';
    const storeAddress = '123 Test';
    const storeId = '123';
    const storeEntity = 'Test Corp';
    const storeMonth = currentMonth;

    //Helpers
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const mainTable = () => page.locator('table').first();

    const rowByCells = (name, address, id) =>
      mainTable()
        .locator('tbody tr')
        .filter({ has: page.locator('td').nth(0).filter({ hasText: new RegExp(`^${esc(name)}$`, 'i') }) })
        .filter({ has: page.locator('td').nth(1).filter({ hasText: new RegExp(`^${esc(address)}$`, 'i') }) })
        .filter({ has: page.locator('td').nth(2).filter({ hasText: new RegExp(`^${esc(id)}$`, 'i') }) })
        .first();

    async function selectStartMonth(month) {
      const dialog = page.getByRole('dialog', { name: /Add New Store/i });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      const trigger = dialog
        .getByRole('button', { name: new RegExp(`^${esc(month)}$`) })
        .first()
        .or(dialog.locator('[aria-haspopup="listbox"]').first());
      await trigger.click().catch(() => {});
      const listbox = page.locator('[role="listbox"]');
      await listbox.waitFor({ state: 'visible', timeout: 2000 }).catch(async () => {
        await trigger.focus();
        await page.keyboard.press('Enter');
        await listbox.waitFor({ state: 'visible', timeout: 2000 });
      });
      await page.getByRole('option', { name: month }).click();
      await expect
        .poll(async () => (await trigger.innerText()).trim(), { timeout: 5000 })
        .toContain(month);
    }

    async function addStore(name) { //Adds the test store with testing informatoin.
      const addBtn = page.locator('button:has(svg[data-testid="AddCircleOutlineIcon"])');
      await expect(addBtn).toBeVisible();
      await addBtn.click(); // plus button to add store.

      const addDialog = page.getByRole('dialog', { name: /Add New Store/i });
      await expect(addDialog).toBeVisible();

      await page.getByLabel(/^Name$/i).fill(name);
      await page.getByLabel(/^Address$/i).fill(storeAddress);
      await page.getByLabel(/^Store ID$/i).fill(storeId);
      await page.getByLabel(/^Entity$/i).fill(storeEntity);
      await selectStartMonth(storeMonth); //Fills test store information into pop up.

      await addDialog.getByRole('button', { name: /^Save$/i }).click();
      await expect(addDialog).toBeHidden({ timeout: 5000 }); //Saves the new test store.
 
      await expect(rowByCells(name, storeAddress, storeId)).toBeVisible({ timeout: 10000 }); //Tests if store was added.
    }

    async function modifyStore(oldName, newName) { //Modfies the test store by changing the name 'Test' to 'Modified'.
      const modifyBtn = page.getByRole('button', { name: /^Modify$/i });
      await modifyBtn.click(); //Clicks modify button to modify the test store.

      const row = rowByCells(oldName, storeAddress, storeId);
      const nameCell = row.locator('td').first();
      await nameCell.click(); //Clicks name.

      const input = page.locator(`input[value="${oldName}"]`); //Finds the 'Test' name
      await expect(input).toBeVisible({ timeout: 5000 });
      await input.fill(newName); //Changes 'Test' to 'Modified'.

      await page.mouse.click(0, 0);
      await page.waitForTimeout(300);

      const saveBtn = page.getByRole('button', { name: /^Save$/i });
      await expect(saveBtn).toBeVisible({ timeout: 5000 });
      await saveBtn.click(); //Saves the modifications.

      const confirmDialog = page.getByRole('dialog', { name: /Confirm Save Changes/i });
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      await confirmDialog.getByRole('button', { name: /^Save$/i }).click();

      await expect(confirmDialog).toBeHidden({ timeout: 10000 });
      await expect(rowByCells(newName, storeAddress, storeId)).toBeVisible({ timeout: 10000 });
    }

    async function deleteStore(name) { //Deletes the test store.
      const modifyBtn = page.getByRole('button', { name: /^Modify$/i });
      await modifyBtn.click();

      const row = rowByCells(name, storeAddress, storeId);
      await expect(row).toBeVisible({ timeout: 5000 });

      const deleteBtn = row.locator('button:has(svg[data-testid="CancelIcon"])');
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click(); //DELETE

      await expect(row).toBeHidden({ timeout: 7000 }).catch(() => {});

      const saveBtn = page.getByRole('button', { name: /^Save$/i });
      await expect(saveBtn).toBeVisible({ timeout: 5000 });
      await saveBtn.click();

      const confirmDialog = page.getByRole('dialog', { name: /Confirm Save Changes/i }); //Saves after store has been deleted.
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      await confirmDialog.getByRole('button', { name: /^Save$/i }).click();

      await expect(confirmDialog).toBeHidden({ timeout: 10000 });
      await expect(rowByCells(name, storeAddress, storeId)).toHaveCount(0, { timeout: 10000 });
    }

    //Cleans up left over stores for clean test.
    async function cleanupOldStores() {
      const modifyBtn = page.getByRole('button', { name: /^Modify$/i });
      if (await modifyBtn.isVisible()) await modifyBtn.click().catch(() => {});
      const candidates = ['Test', 'Modified'];
      for (const name of candidates) {
        const row = rowByCells(name, storeAddress, storeId);
        if (await row.isVisible().catch(() => false)) {
          const delBtn = row.locator('button:has(svg[data-testid="CancelIcon"])');
          await delBtn.click().catch(() => {}); //Deletes left over test stores.
        }
      }
      const saveBtn = page.getByRole('button', { name: /^Save$/i });
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        const confirmDialog = page.getByRole('dialog', { name: /Confirm Save Changes/i });
        if (await confirmDialog.isVisible().catch(() => false)) {
          await confirmDialog.getByRole('button', { name: /^Save$/i }).click();
          await expect(confirmDialog).toBeHidden({ timeout: 10000 });
        }
      }
    }

    //Testing sequence.
    try {
      await cleanupOldStores();
      await addStore(storeName);
      await modifyStore(storeName, modifiedName);
      await deleteStore(modifiedName);
    } finally {
      await context.close();
    }
  });
});
