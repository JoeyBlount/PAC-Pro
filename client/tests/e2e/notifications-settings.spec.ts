import { test, expect } from "@playwright/test";

test.describe("Settings - Notifications Page", () => {
  test.beforeEach(async ({ page }) => {
    // 1️⃣ Navigate to the page (replace URL with your real route)
    await page.goto("http://localhost:3000/settings/notifications");

    // Wait for settings to load
    await expect(page.getByText("Notification Settings")).toBeVisible();
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 5000 });
  });

  test("Modify which roles get a specific notification", async ({ page }) => {
    // Find the first notification row (e.g. Generate Submission)
    const firstNotificationRow = page.locator("text=Generate Submission").first();

    // Open the role selector next to it
    const select = firstNotificationRow
      .locator("xpath=ancestor::div[contains(@class, 'MuiGrid-container')]")
      .locator("label:has-text('Roles')")
      .locator("xpath=ancestor::div[contains(@class, 'MuiFormControl-root')]")
      .locator("div[role='button']");

    await select.click();

    // Select a new role (e.g. "Supervisor")
    await page.locator("li.MuiMenuItem-root:has-text('Supervisor')").click();

    // Click outside to close the dropdown
    await page.keyboard.press("Escape");

    // Click "Update Settings"
    await page.getByRole("button", { name: "Update Settings" }).click();

    // Verify success Snackbar
    const snackbar = page.getByText("Settings updated successfully!");
    await expect(snackbar).toBeVisible();

    // Optional: Verify change persisted after reload
    await page.reload();
    await expect(page.getByText("Generate Submission")).toBeVisible();
    const chip = page.locator("text=Generate Submission")
      .locator("xpath=ancestor::div[contains(@class, 'MuiGrid-container')]")
      .locator("span.MuiChip-label:has-text('Supervisor')");
    await expect(chip).toBeVisible();
  });

  test("Toggle a notification type on/off", async ({ page }) => {
    // Find the switch for "Invoice Submission"
    const switchLocator = page.locator("text=Invoice Submission")
      .locator("xpath=ancestor::div[contains(@class, 'MuiGrid-container')]")
      .locator("input[type='checkbox']");

    // Check initial state
    const initialState = await switchLocator.isChecked();

    // Toggle it
    await switchLocator.click();

    // Expect it changed
    await expect(switchLocator).toHaveJSProperty("checked", !initialState);

    // Save
    await page.getByRole("button", { name: "Update Settings" }).click();

    // Verify success Snackbar
    await expect(page.getByText("Settings updated successfully!")).toBeVisible();

    // Optional: Reload and confirm state persisted
    await page.reload();
    const afterReload = await page
      .locator("text=Invoice Submission")
      .locator("xpath=ancestor::div[contains(@class, 'MuiGrid-container')]")
      .locator("input[type='checkbox']")
      .isChecked();
    expect(afterReload).toBe(!initialState);
  });
});
