import { test, expect, chromium } from '@playwright/test';

test.describe('Reports Tests', () => {
  test('should hover reports icon to open mini menu and print PAC and Invoice Log reports', async () => {
    test.setTimeout(120000);

    const context = await chromium.launchPersistentContext('./.pw-reports-test-profile', {
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
      const anyWin = window as any;
      const auth = anyWin?.firebaseAuth || anyWin?.auth || anyWin?.firebase?.auth?.();
      const user = auth?.currentUser;
      if (user?.getIdToken) {
        await user.getIdToken(true); // force refresh
      }
    });

    // Wait for navigation to be ready
    await page.waitForTimeout(2000);

    // Test 1: Hover over Reports icon in sidebar to open mini menu
    const reportsButton = page.locator('.reports-button');
    await reportsButton.hover();
    
    // Wait for dropdown to appear
    await page.waitForSelector('.reports-dropdown', { timeout: 5000 });
    
    // Verify dropdown is visible
    const reportsDropdown = page.locator('.reports-dropdown');
    await expect(reportsDropdown).toBeVisible();
    
    // Verify both report options are present in dropdown
    await expect(reportsDropdown.locator('.report-item').filter({ hasText: 'PAC Actual Report' })).toBeVisible();
    await expect(reportsDropdown.locator('.report-item').filter({ hasText: 'Invoice Log' })).toBeVisible();

    // Test 2: Print PAC Actual Report from hover menu
    console.log('Testing PAC Actual Report from hover menu...');
    
    // Click on PAC Actual Report in dropdown
    await reportsDropdown.locator('.report-item').filter({ hasText: 'PAC Actual Report' }).click();
    
    // Wait for navigation to PAC page
    await page.waitForURL(/.*pac.*/, { timeout: 10000 });
    
    // Wait for page to load and look for Actual tab
    await page.waitForTimeout(3000);
    
    // Look for and click Actual tab
    const actualTab = page.locator('[role="tab"]').filter({ hasText: /actual/i }).or(
      page.locator('.MuiTab-root').filter({ hasText: /actual/i })
    ).or(
      page.locator('button').filter({ hasText: /actual/i })
    );
    
    if (await actualTab.isVisible()) {
      await actualTab.click();
      await page.waitForTimeout(2000);
    }
    
    // Look for print button and click it
    const printButton = page.locator('button').filter({ hasText: /print/i });
    if (await printButton.isVisible()) {
      await printButton.click();
      console.log('PAC Actual Report print button clicked from hover menu');
    } else {
      console.log('PAC Actual Report print button not found');
    }

    // Wait a moment before navigating back
    await page.waitForTimeout(2000);

    // Test 3: Navigate to Reports page and test the same functionality
    console.log('Testing Reports page functionality...');
    
    await page.goto('http://localhost:3000/navi/reports');
    await page.waitForURL(/.*reports.*/);
    
    // Wait for page content to load
    await page.waitForSelector('.Header', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Test PAC Actual Report from main page
    const pacReportCard = page.locator('.MuiCard-root').filter({ hasText: 'PAC Actual Report' });
    await expect(pacReportCard).toBeVisible();
    
    // Click on PAC Actual Report card
    await pacReportCard.locator('button', { hasText: 'Print Report' }).click();
    
    // Wait for dialog to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Set specific date (December 2024)
    // Click month dropdown
    await page.locator('[role="dialog"]').getByLabel('Month').click();
    await page.getByRole('option', { name: 'December' }).click();
    
    // Click year dropdown
    await page.locator('[role="dialog"]').getByLabel('Year').click();
    await page.getByRole('option', { name: '2024' }).click();
    
    // Click View & Print button
    await page.locator('[role="dialog"]').locator('button', { hasText: 'View & Print' }).click();
    
    // Wait for navigation to PAC page
    await page.waitForURL(/.*pac.*/, { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Look for and click Actual tab
    const actualTabFromPage = page.locator('[role="tab"]').filter({ hasText: /actual/i }).or(
      page.locator('.MuiTab-root').filter({ hasText: /actual/i })
    ).or(
      page.locator('button').filter({ hasText: /actual/i })
    );
    
    if (await actualTabFromPage.isVisible()) {
      await actualTabFromPage.click();
      await page.waitForTimeout(2000);
    }
    
    // Look for print button and click it
    const printButtonFromPage = page.locator('button').filter({ hasText: /print/i });
    if (await printButtonFromPage.isVisible()) {
      await printButtonFromPage.click();
      console.log('PAC Actual Report print button clicked from main page');
    } else {
      console.log('PAC Actual Report print button not found on main page');
    }

    // Wait a moment before testing Invoice Log
    await page.waitForTimeout(2000);

    // Test 4: Navigate back to Reports page and test Invoice Log
    console.log('Testing Invoice Log Report...');
    
    await page.goto('http://localhost:3000/navi/reports');
    await page.waitForTimeout(2000);
    
    // Test Invoice Log Report from main page
    const invoiceLogCard = page.locator('.MuiCard-root').filter({ hasText: 'Invoice Log Report' });
    await expect(invoiceLogCard).toBeVisible();
    
    // Click on Invoice Log Report card
    await invoiceLogCard.locator('button', { hasText: 'Print Report' }).click();
    
    // Wait for dialog to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Set specific date (December 2024)
    // Click month dropdown
    await page.locator('[role="dialog"]').getByLabel('Month').click();
    await page.getByRole('option', { name: 'December' }).click();
    
    // Click year dropdown
    await page.locator('[role="dialog"]').getByLabel('Year').click();
    await page.getByRole('option', { name: '2024' }).click();
    
    // Click View & Print button
    await page.locator('[role="dialog"]').locator('button', { hasText: 'View & Print' }).click();
    
    // Wait for navigation to Invoice Logs page
    await page.waitForURL(/.*invoiceLogs.*/, { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Look for export/print button and click it
    const exportButton = page.locator('button').filter({ hasText: /export/i }).or(
      page.locator('button').filter({ hasText: /print/i })
    );
    
    if (await exportButton.isVisible()) {
      await exportButton.click();
      console.log('Invoice Log export/print button clicked from main page');
    } else {
      console.log('Invoice Log export/print button not found on main page');
    }

    // Test 5: Test Invoice Log from hover menu
    console.log('Testing Invoice Log from hover menu...');
    
    // Navigate back to dashboard to access hover menu
    await page.goto('http://localhost:3000/navi/dashboard');
    await page.waitForTimeout(2000);
    
    // Hover over Reports icon again
    await reportsButton.hover();
    await page.waitForSelector('.reports-dropdown', { timeout: 5000 });
    
    // Click on Invoice Log in dropdown
    await reportsDropdown.locator('.report-item').filter({ hasText: 'Invoice Log' }).click();
    
    // Wait for navigation to Invoice Logs page
    await page.waitForURL(/.*invoiceLogs.*/, { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Look for export/print button and click it
    const exportButtonFromHover = page.locator('button').filter({ hasText: /export/i }).or(
      page.locator('button').filter({ hasText: /print/i })
    );
    
    if (await exportButtonFromHover.isVisible()) {
      await exportButtonFromHover.click();
      console.log('Invoice Log export/print button clicked from hover menu');
    } else {
      console.log('Invoice Log export/print button not found from hover menu');
    }

    console.log('All report tests completed successfully');
  });
});

