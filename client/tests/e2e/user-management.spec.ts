import { test, expect, Page } from '@playwright/test';
test.use({ storageState: './auth.json' });
test.use({ headless: true, channel: 'chrome' });
import path from 'path';

test.describe('User Management – add(Accountant) → promote(Admin) → delete', () => {
  test('creates Test Testingson, promotes to Admin, then deletes', async ({ page }, testInfo) => {
    test.setTimeout(150_000);

    //Confirmation
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'confirm') await dialog.accept();
      else await dialog.dismiss();
    });


    //Helpers
    function escapeRegex(s: string) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    const cardByEmail = (email: string) =>
      page.locator('div').filter({ hasText: new RegExp(`Email:\\s*${escapeRegex(email)}`, 'i') }).first();
    const cardContainerByEmail = (email: string) => {
      const emailLine = page.getByText(new RegExp(`^Email:\\s*${escapeRegex(email)}$`, 'i')).first();
      return emailLine.locator('xpath=ancestor::div[contains(@class,"MuiPaper-root")][1]');
    };

    const openSelectInDialog = async (labelText: string) => {
      const dialog = page.getByRole('dialog');
      const form = dialog.locator(`.MuiFormControl-root:has-text("${labelText}")`).first();
      const trigger = form.getByRole('button').first().or(form.locator('[aria-haspopup="listbox"]').first());
      await trigger.click();
      await page.locator('[role="listbox"]').waitFor({ state: 'visible' });
    };
    const chooseOptionByLabel = async (label: string) => {
      await page.getByRole('option', { name: new RegExp(`^${escapeRegex(label)}$`, 'i') }).click();
      await expect(page.locator('[role="listbox"]')).toBeHidden({ timeout: 10_000 });
    };

    try {
      // Login using saved state (click Google if still on login)
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
      const googleBtn = page.getByRole('button', { name: /^Login with Google$/i });
      if (await googleBtn.isVisible().catch(() => false)) {
        await googleBtn.click();
      }
      await page.waitForURL(/\/navi\/dashboard/i, { timeout: 45_000 }).catch(() => {});

      //Navigate to User Management in settings page. 
      const navLink = page.getByRole('link', { name: /User Management/i }).first();
      if (await navLink.isVisible().catch(() => false)) {
        await navLink.click();
      } else {
        await page.goto('http://localhost:3000/navi/settings/user-management', { waitUntil: 'domcontentloaded' });
      }
      await expect(page).toHaveURL(/\/navi\/settings\/user-management/i, { timeout: 15_000 });
      await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible({ timeout: 30_000 }); //Checking

      //Ensure no leftover test user from previous runs (idempotent)
      const email = 'Testing@testing.test';
      const existing = cardContainerByEmail(email);
      if ((await existing.count()) > 0) {
        const existingDeleteBtn = existing.locator('button').filter({ has: page.locator('svg[data-testid="CloseIcon"]') }).first();
        if (await existingDeleteBtn.isVisible().catch(() => false)) {
          await existingDeleteBtn.click();
          const confirmDialog = page.getByRole('dialog', { name: /Confirm Delete/i });
          await expect(confirmDialog).toBeVisible({ timeout: 10_000 });
          await confirmDialog.getByRole('button', { name: /^Delete$/i }).click();
          await expect(confirmDialog).toBeHidden({ timeout: 15_000 });
          await expect(existing).toHaveCount(0, { timeout: 20_000 });
        }
      }

      //Adds a new user.
      const addBtn = page.getByRole('button', { name: /^Add User$/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 15_000 });
      await addBtn.click();

      const addDialog = page.getByRole('dialog', { name: /Add New User/i });
      await expect(addDialog).toBeVisible({ timeout: 10_000 });

      const firstName = 'Test';
      const lastName = 'Testingson';

      await addDialog.getByRole('textbox', { name: /First Name/i }).fill(firstName);
      await addDialog.getByRole('textbox', { name: /Last Name/i }).fill(lastName);
      await addDialog.getByRole('textbox', { name: /Email/i }).fill(email);

      //Sets new user role to accountant (to be modified)
      await openSelectInDialog('Role');
      await chooseOptionByLabel('Accountant');

      // Assign a store.
      const assignBtn = addDialog.getByRole('button', { name: /Assign Store/i }).first();
      await expect(assignBtn).toBeVisible({ timeout: 10_000 });
      await assignBtn.click();
      // Pick first store
      await page.locator('ul[role="menu"] [role="menuitem"]').first().click();

      //Confirms adding the new user.
      const addConfirm = addDialog.getByRole('button', { name: /^(Add User|Add)$/i });
			await expect(addConfirm).toBeVisible();
			await addConfirm.click();
			// Be resilient: dialog may remain visible briefly while backend processes.
			// Wait for either the dialog to close OR the new card to appear, then ensure dialog is closed.
			const tryHide = addDialog.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => null);
			const waitCard = cardContainerByEmail(email).waitFor({ state: 'visible', timeout: 30_000 }).catch(() => null);
			await Promise.race([tryHide, waitCard]);
			if (await addDialog.isVisible().catch(() => false)) {
				// If dialog still visible but user card exists, close gracefully
				if (await cardContainerByEmail(email).isVisible().catch(() => false)) {
					const cancelBtn = addDialog.getByRole('button', { name: /^Cancel$/i });
					if (await cancelBtn.isVisible().catch(() => false)) {
						await cancelBtn.click();
					}
					await addDialog.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
				} else {
					// Neither condition met: fail fast with clearer message
					await expect(addDialog).toBeHidden({ timeout: 5_000 });
				}
			}

      //Validates user is added and role is Accountant.
      await expect(cardContainerByEmail(email)).toBeVisible({ timeout: 20_000 });
      await expect(cardContainerByEmail(email).getByText(/^Role:\s*Accountant$/i)).toBeVisible({ timeout: 10_000 });
      
      //Modify the new user by changing roles.
      const userCard = cardContainerByEmail(email);
      await expect(userCard).toBeVisible({ timeout: 10_000 });

      const editBtn = userCard.locator('button').filter({ has: page.locator('svg[data-testid="EditIcon"]') }).first();
      await expect(editBtn).toBeVisible();
      await editBtn.click();

      const editDialog = page.getByRole('dialog', { name: /Edit Role/i }).or(page.getByRole('dialog', { name: /Edit/i }));
      await expect(editDialog).toBeVisible({ timeout: 10_000 });

      await openSelectInDialog('Role');
      await chooseOptionByLabel('Admin'); //Accountant to -> Admin.

      const saveBtn = editDialog.getByRole('button', { name: /^(Save Role|Update|Save)$/i });
      await expect(saveBtn).toBeVisible();
      await saveBtn.click(); //save changes.
      await expect(editDialog).toBeHidden({ timeout: 15_000 });

      //Validates and checks updated role is Admin.
      await expect(cardContainerByEmail(email)).toBeVisible({ timeout: 20_000 });
      await expect(cardContainerByEmail(email).getByText(/^Role:\s*Admin$/i)).toBeVisible({ timeout: 10_000 });

      //Deletes the newly created and modified user.
      const deleteBtn = userCard.locator('button').filter({ has: page.locator('svg[data-testid="CloseIcon"]') }).first();
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();

      const confirmDialog = page.getByRole('dialog', { name: /Confirm Delete/i }); 
      await expect(confirmDialog).toBeVisible({ timeout: 10_000 });
      await confirmDialog.getByRole('button', { name: /^Delete$/i }).click();
      await expect(confirmDialog).toBeHidden({ timeout: 15_000 }); 
      //Validates the new Testing user is deleted.
      await expect(cardByEmail(email)).toHaveCount(0, { timeout: 20_000 });

    } catch (err) {
      const shotPath = path.join(testInfo.outputDir, 'user-mgmt-failure.png');
      await page.screenshot({ path: shotPath, fullPage: true });
      throw new Error(`UserManagement e2e failed. Screenshot: ${shotPath}\n${(err as Error).stack || err}`);
    } finally {
      // no-op
    }
  });
});
