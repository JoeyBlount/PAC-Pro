import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';
import path from 'path';

test.describe('User Management – add(Accountant) → promote(Admin) → delete', () => {
  test('creates Test Testingson, promotes to Admin, then deletes', async ({}, testInfo) => {
    test.setTimeout(150_000);

    const context: BrowserContext = await chromium.launchPersistentContext('./.pw-user-mgmt-profile', {
      channel: 'chrome',
      headless: false,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled'],
    });
    const page: Page = await context.newPage();

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
      //Prompts the user to log in.
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
      const needsLogin = await page.getByText(/Sign In/i).isVisible().catch(() => false);
      if (needsLogin) await page.pause(); //Wait for log in then proceeds to dash.
      await page.waitForURL(/dashboard|home|navi/i, { timeout: 20_000 }).catch(() => {});

      //Navigate to User Management in settings page. 
      const navLink = page.getByRole('link', { name: /User Management/i }).first();
      if (await navLink.isVisible().catch(() => false)) {
        await navLink.click();
      } else {
        await page.goto('http://localhost:3000/navi/settings/user-management', { waitUntil: 'domcontentloaded' });
      }

      await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible({ timeout: 30_000 }); //Checking

      //Adds a new user.
      const addBtn = page.getByRole('button', { name: /^Add User$/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 15_000 });
      await addBtn.click();

      const addDialog = page.getByRole('dialog', { name: /Add New User/i });
      await expect(addDialog).toBeVisible({ timeout: 10_000 });

      const firstName = 'Test';
      const lastName = 'Testingson';
      const email = 'Testing@testing.test';

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
      await expect(addDialog).toBeHidden({ timeout: 15_000 });

      //Validates user is added.
      await expect(cardByEmail(email)).toBeVisible({ timeout: 20_000 });
      
      //Modify the new user by changing roles.
      const userCard = cardByEmail(email);
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

      //Validates
      await expect(cardByEmail(email)).toBeVisible({ timeout: 20_000 });

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
      await context.close();
    }
  });
});
