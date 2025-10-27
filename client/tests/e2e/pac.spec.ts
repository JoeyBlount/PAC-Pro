import { test, expect, chromium, Page, Locator } from '@playwright/test';

const FRONTEND = 'http://localhost:3000';
const PAC_URL = `${FRONTEND}/navi/pac`;

/* ---------------- helpers ---------------- */

// Strip zero-width chars, currency, commas; keep digits, dot, minus; convert (x)→-x
const normalizeNumericText = (s: string) =>
  s
    .replace(/\u200b/g, '')
    .replace(/[()]/g, m => (m === '(' ? '-' : ''))
    .replace(/[^\d.-]+/g, '');

async function readProjectedDollar(
  page: Page,
  row: Locator,
  cellIndex = 1,
  nthInput = 0,
  timeoutMs = 4000
): Promise<number> {
  const cell = row.locator('td').nth(cellIndex);

  const candidates = [
    cell.locator('input[type="number"]').nth(nthInput),
    cell.getByRole('spinbutton').nth(nthInput),
    cell.locator('input').nth(nthInput),
  ];
  for (const cand of candidates) {
    if (await cand.count()) {
      if (await cand.isVisible()) {
        try { await expect(cand).toHaveValue(/\d/, { timeout: timeoutMs }); } catch { }
        const raw = await cand.inputValue();
        return Number(normalizeNumericText(raw));
      }
    }
  }

  try { await expect(cell).toContainText(/\d/, { timeout: timeoutMs }); } catch { }
  const rawText = await cell.innerText();
  const cleaned = normalizeNumericText(rawText);
  return cleaned ? Number(cleaned) : NaN;
}

function rowByLabel(page: Page, label: string | RegExp) {
  return page
    .locator('tbody tr')
    .filter({ has: page.locator('td').first().filter({ hasText: label }) })
    .first();
}

async function numberInputInCell(row: Locator, cellIndex: number, nth = 0) {
  await row.waitFor({ state: 'visible', timeout: 5000 });
  const cell = row.locator('td').nth(cellIndex);
  await cell.waitFor({ state: 'visible', timeout: 5000 });

  let input = cell.locator('input[type="number"]').nth(nth);
  if (await input.count() === 0) input = cell.getByRole('spinbutton').nth(nth);
  if (await input.count() === 0) input = cell.locator('input').nth(nth);

  if ((await input.count()) === 0) return null;
  if (!(await input.isVisible())) return null;
  const disabled = await input.getAttribute('disabled');
  if (disabled !== null) return null;

  return input;
}

async function fillAndAssertNumericOnly(input: Locator, value: string) {
  await input.fill('');
  await input.fill(value);
  await expect(input).toHaveValue(value);
  await input.pressSequentially('abc', { delay: 5 });
  await expect(input).toHaveValue(value);
}

async function fillIfEditable(row: Locator, cellIndex: number, value: string) {
  const input = await numberInputInCell(row, cellIndex);
  if (!input) return false;
  await fillAndAssertNumericOnly(input, value);
  return true;
}

// Not fatal if seed doesn't happen
async function waitForNextSeed(page: Page, timeout = 12000) {
  try {
    await page.waitForResponse(r => r.url().includes('/api/pac/projections/seed'), { timeout });
  } catch { /* ignore */ }
}

function ensurePageOpen(page: Page) {
  if (page.isClosed()) throw new Error('The page/browser was closed during the pause.');
}

/** Read the P.A.C. projected % (as number, e.g. 7.25) from the table (Projected % column). */
async function readPacProjectedPercent(page: Page): Promise<number | null> {
  const pacRow = rowByLabel(page, /^P\.A\.C\.$/i);
  await pacRow.waitFor({ state: 'visible', timeout: 5000 });
  const pctCell = pacRow.locator('td').nth(2); // Projected %
  const raw = (await pctCell.innerText()).trim().replace(/\u200b/g, '');
  const num = Number(normalizeNumericText(raw));
  return Number.isFinite(num) ? num : null;
}

async function trySetPacGoal(page: Page, percent: number): Promise<boolean> {
  // Click "Change" if present (only for admin+editable period)
  const changeBtn = page.getByRole('button', { name: /^Change$/ });
  if (!(await changeBtn.isVisible())) return false;
  await changeBtn.click();

  // PAC Goal edit input is in THEAD; target any number input in thead
  const goalInput = page.locator('thead input[type="number"]').first();
  if (!(await goalInput.isVisible())) return false;

  // Fill exact percent (2 decimals is fine per your tolerance ±0.01)
  const toSet = percent.toFixed(2);
  await goalInput.fill('');
  await goalInput.fill(toSet);
  await expect(goalInput).toHaveValue(toSet);

  // Save
  const saveBtn = page.getByRole('button', { name: /^Save$/ });
  await saveBtn.click();

  // give UI a moment to persist and recalc gating
  await page.waitForTimeout(400);
  return true;
}

/* ---------------- the test ---------------- */

test.describe('PAC – full input coverage + Apply/Submit (auto-enable Apply)', () => {
  test('Projections: edit all inputs + auto-match PAC Goal + Apply; Generate: edit all inputs + Submit', async () => {
    const context = await chromium.launchPersistentContext('./.pw-pac-test-profile', {
      channel: 'chrome',
      headless: false,
      ignoreDefaultArgs: ['--enable-automation'],
      args: ['--disable-blink-features=AutomationControlled'],
    });
    const page = await context.newPage();

    // Manual login first time
    await page.goto(FRONTEND);
    await page.pause(); 
    console.log('sign in manually, then Resume.');

    // Optional: refresh Firebase id token
    await page.evaluate(async () => {
      const anyWin = window as any;
      const auth = anyWin?.firebaseAuth || anyWin?.auth || anyWin?.firebase?.auth?.();
      const user = auth?.currentUser;
      if (user?.getIdToken) await user.getIdToken(true);
    });

    // PAC page + pick unlocked period
    await page.goto(PAC_URL);
    console.log('pick an UNLOCKED month/year(September if you want apply to work, any other month if not), then Resume.');
    await page.pause();
    ensurePageOpen(page);

    /* ---------------- PROJECTIONS ---------------- */
    await page.getByRole('tab', { name: 'Projections' }).click();

    // Iterate all visible rows; try editing Projected $ (cell 1) and Projected % (cell 2).
    const rows = page.locator('tbody tr');
    const count = await rows.count();

    // Track All Net Sales / Advertising for the math assertion later
    let allNetRowFound: Locator | null = null;
    let advRowFound: Locator | null = null;

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const nameCell = row.locator('td').first();
      const nameText = (await nameCell.innerText()).trim();

      // Skip totals/summary rows & P.A.C. row edits
      if (/Totals?/i.test(nameText) || /^P\.A\.C\./i.test(nameText)) continue;

      // Special cases: Product Sales and All Net Sales
      if (/^Product Sales$/i.test(nameText)) {
        await fillIfEditable(row, 1, '20000'); 
        await fillIfEditable(row, 2, '2');     
      } 
      else if (/^All Net Sales$/i.test(nameText)) {
        await fillIfEditable(row, 1, '100000');
        await fillIfEditable(row, 2, '2');     
      }
      else {
        // Default behavior for other rows
        await fillIfEditable(row, 1, '11'); // dollars
        await fillIfEditable(row, 2, '2');  // percent
      }

      if (/^All Net Sales$/i.test(nameText)) allNetRowFound = row;
      if (/^Advertising\b/i.test(nameText)) advRowFound = row;
    }


    // If both rows present and editable, assert $ math: 100000 at All Net Sales + 2% at Advertising → $2000
    if (allNetRowFound && advRowFound) {
      const allNetInput = await numberInputInCell(allNetRowFound, 1);
      if (allNetInput) await fillAndAssertNumericOnly(allNetInput, '100000');

      const advPctInput = await numberInputInCell(advRowFound, 2);
      if (advPctInput) await fillAndAssertNumericOnly(advPctInput, '2');

      await page.waitForTimeout(400);
      const advDollar = await readProjectedDollar(page, advRowFound, 1);
      if (!Number.isNaN(advDollar)) expect(advDollar).toBe(2000);
    }

    // APPLY button: ensure it becomes enabled by aligning PAC Goal to current P.A.C. projected %
    const applyButton = page.getByRole('button', { name: /^Apply$/ });
    await expect(applyButton).toBeVisible();

    if (!(await applyButton.isEnabled())) {
      // read the currently computed P.A.C. projected %
      const pacPct = await readPacProjectedPercent(page);
      if (pacPct != null) {
        const changed = await trySetPacGoal(page, pacPct);
        if (changed) {
          await expect(applyButton, 'Apply should enable after matching PAC Goal to projected %').toBeEnabled();
        } else {
          console.warn('Could not edit PAC Goal (not admin or past period). Apply may remain disabled.');
        }
      } else {
        console.warn('Could not read P.A.C. projected %; skipping goal alignment.');
      }
    }

    // Click Apply if enabled
    if (await applyButton.isEnabled()) {
      const dialogs: string[] = [];
      page.on('dialog', async d => {
        dialogs.push(`${d.type()}: ${d.message()}`);
        await d.accept();
      });
      await applyButton.click();
      await page.waitForTimeout(800); // wait for potential alert
        console.log('Apply ', dialogs.join(' | '));
      
    } else {
      console.log('Apply is disabled (PAC mismatch and goal not editable).');
    }

    /* ---------------- GENERATE ---------------- */
    await page.getByRole('tab', { name: 'Generate' }).click();

    // Fill EVERY numeric input in Generate
    const genInputs = page.locator('.pac-section .input-row input[type="number"]');
    const genCount = await genInputs.count();
    for (let i = 0; i < genCount; i++) {
      const inp = genInputs.nth(i);
      if (!(await inp.isVisible())) continue;
      if ((await inp.getAttribute('disabled')) !== null) continue;

      const val = (1000 + i).toString();
      await fillAndAssertNumericOnly(inp, val);
    }

    // SUBMIT button: click if enabled, else log, require at least one success-like alert
    const submitBtn = page.getByRole('button', { name: /^Submit$/ });
    await expect(submitBtn).toBeVisible();
    if (await submitBtn.isEnabled()) {
      const dialogs: string[] = [];
      page.on('dialog', async d => {
        dialogs.push(`${d.type()}: ${d.message()}`);
      });

      await submitBtn.click();
      await waitForNextSeed(page, 8000);
      await page.waitForTimeout(800);

      const success = dialogs.some(m => /saved|success|Generate submission saved/i.test(m));
      expect(success, `Expected a success alert after Submit. Got: ${dialogs.join(' | ')}`).toBeTruthy();

      const hadComputeError = dialogs.some(m => /PAC Actual computation failed/i.test(m));
      if (hadComputeError) console.warn('PAC Actual compute threw an error (non-fatal for this test).');
    } else {
      console.log('Submit is disabled.');
    }

    await context.close();
  });
});
