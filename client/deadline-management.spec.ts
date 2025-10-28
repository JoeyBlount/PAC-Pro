import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';

test.describe('Deadline Management – add, modify, delete', () => {
  test('adds "Test", renames to "Modified", then deletes it', async ({}, testInfo) => {
    test.setTimeout(150_000);

   
    const context: BrowserContext = await chromium.launchPersistentContext('./.pw-deadlines-test-profile', {
      channel: 'chrome',
      headless: false,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled'],
    });
    const page: Page = await context.newPage();

    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'confirm') await dialog.accept();
      else await dialog.dismiss();
    });

    try {
      //Prompts user to log in with email.
      await page.goto('http://localhost:3000');
      const needsLogin = await page.getByText(/Sign In/i).isVisible().catch(() => false);
      if (needsLogin) await page.pause(); // perform Google login once; persisted in profile
      await page.waitForURL(/.*dashboard.*/, { timeout: 20000 }).catch(() => {});

      await page.evaluate(async () => {
        const w: any = window as any;
        const auth = w?.firebaseAuth || w?.auth || w?.firebase?.auth?.();
        const user = auth?.currentUser;
        if (user?.getIdToken) await user.getIdToken(true);
      }).catch(() => {});

      //Navigate to the Deadline management settings page.
      const navLink = page.getByRole('link', { name: /Deadline Management/i }).first();
      if (await navLink.isVisible().catch(() => false)) {
        await navLink.click();
      } else {
        await page.goto('http://localhost:3000/navi/settings/deadline-management');
      }

      //Checks if on correct page.
      await expect(page.getByRole('heading', { name: /Deadline Management/i })).toBeVisible({ timeout: 10000 });

      //Admin role.
      const manageBanner = page.getByText(/Manage end-of-month submission deadlines/i);
      const viewBanner = page.getByText(/View submission deadlines/i);
      const isManage = await manageBanner.isVisible().catch(() => false);
      const isViewOnly = await viewBanner.isVisible().catch(() => false);
      const addBtn = page.getByRole('button', { name: /^Add Deadline$/i }).first();

      if (isViewOnly || !isManage || !(await addBtn.isVisible().catch(() => false))) {
        const shotPath = path.join(testInfo.outputDir, 'deadline-add-modify-delete-unavailable.png');
        await page.screenshot({ path: shotPath, fullPage: true });
        throw new Error(`Cannot add/modify/delete (likely non-admin or button hidden). Screenshot: ${shotPath}`);
      }

      //Test deadline.
      const title = 'Test';
      const newTitle = 'Modified'; //Modified name.
      const typeLabel = 'PAC';
      const description = 'Testing';
      const dueDate = new Date().toISOString().slice(0, 10); //Current date
      const recurringLabel = 'One-time';

      //Helpers
      const mainTable = () => page.locator('table').first();
      const rowByTitle = (t: string) =>
        mainTable()
          .locator('tbody tr')
          .filter({
            has: page.locator('td').first().filter({ hasText: new RegExp(`^${escapeRegex(t)}$`, 'i') }),
          })
          .first();

      function escapeRegex(s: string) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }

      async function waitForLoadedTable() {
        const loading = page.getByText(/Loading deadlines\.\.\./i);
        if (await loading.isVisible().catch(() => false)) {
          await expect(loading).toBeHidden({ timeout: 10000 });
        }
        await expect(mainTable().locator('tbody')).toBeVisible({ timeout: 10000 });
      }

      async function openSelectInDialog(labelText: string) { 
        const dialog = page.getByRole('dialog');
        const form = dialog.locator(`.MuiFormControl-root:has-text("${labelText}")`).first();
        const trigger = form.getByRole('button').first().or(form.locator('[aria-haspopup="listbox"]').first());
        await trigger.click();
        const listbox = page.locator('[role="listbox"]');
        await listbox.waitFor({ state: 'visible' });
      }

      async function chooseOptionByLabel(label: string) {
        await page.getByRole('option', { name: new RegExp(`^${escapeRegex(label)}$`, 'i') }).click();
        await expect(page.locator('[role="listbox"]')).toBeHidden({ timeout: 5000 });
      }

      await waitForLoadedTable();

      //Adds test deadline.
      await addBtn.click();
      const addDialog = page.getByRole('dialog', { name: /Add New Deadline/i });
      await expect(addDialog).toBeVisible({ timeout: 8000 });

      await addDialog.getByRole('textbox', { name: /Title/i }).fill(title);

      await openSelectInDialog('Type');
      await chooseOptionByLabel(typeLabel);

      await addDialog.getByRole('textbox', { name: /Due Date/i }).fill(dueDate);

      await addDialog.getByRole('textbox', { name: /Description/i }).fill(description);

      await openSelectInDialog('Recurring');
      await chooseOptionByLabel(recurringLabel);

      await addDialog.getByRole('button', { name: /^Add$/i }).click(); //Confirm add.
      await expect(addDialog).toBeHidden({ timeout: 8000 });

      await expect(rowByTitle(title)).toBeVisible({ timeout: 10000 });

      //Modifies test deadline by changing 'Test' name to 'Modified'.
      const row = rowByTitle(title);
      await expect(row).toBeVisible({ timeout: 8000 });

      const editBtn = row.locator('button').filter({ has: page.locator('svg[data-testid="EditIcon"]') }).first();
      await expect(editBtn).toBeVisible();
      await editBtn.click();

      const editDialog = page.getByRole('dialog', { name: /Edit Deadline/i });
      await expect(editDialog).toBeVisible({ timeout: 8000 });

      const titleInput = editDialog.getByRole('textbox', { name: /Title/i });
      await expect(titleInput).toBeVisible({ timeout: 5000 });
      await titleInput.fill(newTitle);

      const updateBtn = editDialog.getByRole('button', { name: /^Update$/i });
      await expect(updateBtn).toBeVisible({ timeout: 5000 });
      await updateBtn.click(); //Confirm changes.

      await expect(editDialog).toBeHidden({ timeout: 8000 });

      await expect(rowByTitle(newTitle)).toBeVisible({ timeout: 10000 });
      await expect(rowByTitle(title)).toHaveCount(0, { timeout: 10000 });

      //Deletes the Modified deadline.
      const modRow = rowByTitle(newTitle);
      await expect(modRow).toBeVisible({ timeout: 8000 });

      const deleteBtn = modRow.locator('button').filter({ has: page.locator('svg[data-testid="DeleteIcon"]') }).first();
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click(); //Confirm deletion.

      // Verify it disappears from the main table
      await expect(rowByTitle(newTitle)).toHaveCount(0, { timeout: 12000 });

    } finally {
      await context.close();
    }
  });
});
