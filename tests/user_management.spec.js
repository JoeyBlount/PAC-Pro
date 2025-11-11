import { test, expect } from '@playwright/test';

test.describe('User Management - Settings Page', () => {
  // This runs before each test
  test.beforeEach(async ({ page }) => {
    // Go to your app and log in as an admin
    await page.goto('http://127.0.0.1:5140/test-login');
    // await page.goto('http://localhost:3000/navi/settings/user-management'); // update if needed
    await page.pause();
});

  // -------------------------------
  // 1️⃣ Add a new user
  // -------------------------------
  test('should add a new user', async ({ page }) => {
    // await page.click('text=Add User');

    // // Fill form fields
    // await page.fill('input[name="name"]', 'John Doe');
    // await page.fill('input[name="email"]', 'john.doe@example.com');
    // await page.selectOption('select[name="role"]', 'Supervisor');

    // // Submit
    // await page.click('button:has-text("Save")');

    // // Expect new user appears in table
    // await expect(page.locator('table')).toContainText('John Doe');
    // await expect(page.locator('table')).toContainText('Supervisor');
  });

  // -------------------------------
  // 2️⃣ Modify an existing user
  // -------------------------------
  test('should modify existing user info', async ({ page }) => {
    // // Find the row with "John Doe"
    // const userRow = page.locator('tr', { hasText: 'John Doe' });
    // await userRow.locator('button:has-text("Edit")').click();

    // // Modify fields
    // await page.fill('input[name="email"]', 'john.updated@example.com');
    // await page.selectOption('select[name="role"]', 'Accountant');
    // await page.click('button:has-text("Save Changes")');

    // // Verify updated info
    // await expect(page.locator('table')).toContainText('john.updated@example.com');
    // await expect(page.locator('table')).toContainText('Accountant');
  });

  // -------------------------------
  // 3️⃣ Delete an existing user
  // -------------------------------
  test('should delete an existing user', async ({ page }) => {
    // const userRow = page.locator('tr', { hasText: 'John Doe' });
    // await userRow.locator('button:has-text("Delete")').click();

    // // Confirm delete popup (if it exists)
    // const confirm = page.locator('button:has-text("Confirm")');
    // if (await confirm.isVisible()) {
    //   await confirm.click();
    // }

    // // Verify removal
    // await expect(page.locator('table')).not.toContainText('John Doe');
  });
});
