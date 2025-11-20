import { test, expect } from "@playwright/test";
test.use({ storageState: './auth.json' });
test.use({ headless: true, channel: 'chrome' });

test.describe("Notifications Settings", () => {
  test.beforeEach(async ({ page }) => {
    // Start at root, complete login if needed, then navigate to Notifications
    await page.goto("http://localhost:3000");
    const googleBtn = page.getByRole('button', { name: /^Login with Google$/i });
    if (await googleBtn.isVisible().catch(() => false)) {
      await googleBtn.click();
    }
    // Keep within beforeEach time budget
    await page.waitForURL(/\/navi\/dashboard/i, { timeout: 20000 }).catch(() => {});
    // Now navigate to Notifications
    await page.goto("http://localhost:3000/navi/settings/notifications");
    // If redirected back to login, click once more and return
    const loginBtn2 = page.getByRole('button', { name: /^Login with Google$/i });
    if (await loginBtn2.isVisible().catch(() => false)) {
      await loginBtn2.click();
      await page.waitForURL(/\/navi\/dashboard/i, { timeout: 15000 }).catch(() => {});
      await page.goto("http://localhost:3000/navi/settings/notifications");
    }
    await expect(page).toHaveURL(/\/navi\/settings\/notifications/i, { timeout: 15000 });

    // Wait for settings to load
    await expect(page.getByText("Notification Settings")).toBeVisible({ timeout: 15000 });
    // Gate readiness on the presence of the primary action
    await expect(page.getByRole("button", { name: "Update Settings" })).toBeVisible({ timeout: 15000 });
    // Ensure data has loaded from backend at least once
    await page.waitForResponse((res) => {
      try {
        const u = new URL(res.url());
        return u.pathname.endsWith('/api/pac/settings/notifications/') && res.ok();
      } catch { return false; }
    }, { timeout: 15000 }).catch(() => {});
  });

  test("Modify which roles get a specific notification", async ({ page }) => {
    // Wait for rows to render and find the target row via test id
    const row = page.getByTestId('notif-row-generate-submission');
    await expect(row).toBeVisible();

    // Open the Roles select within this row (be robust across MUI variants)
    // Locate the Roles select trigger using multiple resilient strategies
    // Prefer the actual combobox element within the roles-select container to avoid strict-mode conflicts
    let rolesTrigger = row.locator('[data-testid="roles-select"] [role="combobox"]').first();
    if (await rolesTrigger.count() === 0) {
      // Fallback: any combobox within the row
      rolesTrigger = row.locator('[role="combobox"]').first();
    }

    // Ensure it exists and is interactable
    await expect(rolesTrigger).toBeVisible({ timeout: 12000 });
    await rolesTrigger.scrollIntoViewIfNeeded();
    // Click (with fallback to force)
    await rolesTrigger.click({ timeout: 3000 }).catch(async () => {
      await rolesTrigger.focus().catch(() => {});
      await page.keyboard.press('Enter').catch(() => {});
    });
    // Wait for the options listbox
    await page.locator('[role="listbox"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    // Select a new role (e.g., Supervisor)
    // Choose a role that is not already selected to avoid toggling it off
    const candidateRoles = ['Supervisor', 'Office Manager', 'General Manager', 'Accountant'];
    let chosenRole = 'Supervisor';
    for (const r of candidateRoles) {
      const chipExists = await row.locator(`span.MuiChip-label:has-text("${r}")`).first().isVisible().catch(() => false);
      if (!chipExists) { chosenRole = r; break; }
    }
    // Select the chosen role (by role first, then fallback to menu item)
    const opt = page.getByRole('option', { name: new RegExp(`^${chosenRole}$`) }).first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click();
    } else {
      await page.locator(`li.MuiMenuItem-root:has-text("${chosenRole}")`).first().click({ trial: false }).catch(() => {});
    }

    // Close the dropdown if still open
    await page.keyboard.press('Escape').catch(() => {});

    // Click "Update Settings" and wait for backend save
    const waitSave = page.waitForResponse((res) => {
      try {
        const u = new URL(res.url());
        return u.pathname.endsWith('/api/pac/settings/notifications/') && res.request().method() === 'POST';
      } catch { return false; }
    }, { timeout: 15000 }).catch(() => null);
    await page.getByTestId("update-settings-btn").click();
    await waitSave;

    // Verify success Snackbar
    const snackbar = page.getByText("Settings updated successfully!");
    await expect(snackbar).toBeVisible();

    // Optional: Verify change persisted after reload
    /*await page.reload();
    await page.waitForResponse((res) => {
      try {
        const u = new URL(res.url());
        return u.pathname.endsWith('/api/pac/settings/notifications/') && res.ok();
      } catch { return false; }
    }, { timeout: 15000 }).catch(() => {});
    await expect(page.getByText("Generate Submission")).toBeVisible();
    const chip = page.getByText("Generate Submission")
      .locator('xpath=ancestor::*[contains(@class,"MuiStack-root")][1]')
      .locator(`span.MuiChip-label:has-text('${chosenRole}')`);
    await expect(chip).toBeVisible();
    */
  });

  test("Toggle a notification type on/off", async ({ page }) => {
    // Find the row for "Invoice Submission"
    await expect(page.getByText("Invoice Submission")).toBeVisible({ timeout: 15000 });
    const row = page.getByText("Invoice Submission").locator('xpath=ancestor::*[contains(@class,"MuiStack-root")][1]');
    const switchLocator = row.locator('input[type="checkbox"]');
    await expect(switchLocator).toBeVisible();

    // Check initial state
    const initialState = await switchLocator.isChecked();

    // Toggle it
    await switchLocator.click();

    // Expect it changed
    await expect(switchLocator).toHaveJSProperty("checked", !initialState);

    // Save and wait for backend POST
    const waitSave = page.waitForResponse((res) => {
      try {
        const u = new URL(res.url());
        return u.pathname.endsWith('/api/pac/settings/notifications/') && res.request().method() === 'POST';
      } catch { return false; }
    }, { timeout: 15000 }).catch(() => null);
    await page.getByRole("button", { name: "Update Settings" }).click();
    await waitSave;

    // Verify success Snackbar
    await expect(page.getByText("Settings updated successfully!")).toBeVisible();

    // Optional: Reload and confirm state persisted
    await page.reload();
    await page.waitForResponse((res) => {
      try {
        const u = new URL(res.url());
        return u.pathname.endsWith('/api/pac/settings/notifications/') && res.ok();
      } catch { return false; }
    }, { timeout: 15000 }).catch(() => {});
    const afterReload = await page.getByText("Invoice Submission")
      .locator('xpath=ancestor::*[contains(@class,"MuiStack-root")][1]')
      .locator('input[type="checkbox"]').isChecked();
    expect(afterReload).toBe(!initialState);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const safeTitle = testInfo.title.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
      const filePath = require('path').join(testInfo.outputDir, `${safeTitle}-${testInfo.status || 'failed'}.png`);
      await page.screenshot({ path: filePath, fullPage: true }).catch(() => {});
    }
  });
});
