import { test, expect, chromium } from '@playwright/test';

test.describe('Submit Invoice Tests', () => {
  test('should submit invoice with all required fields', async () => {
    test.setTimeout(60000);

    const context = await chromium.launchPersistentContext('./.pw-invoice-test-profile', {
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
  });
});
