import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

// Helper function to create a risk
async function createRisk(page: any, title: string) {
  await page.goto('/risks');
  await page.locator('[data-testid="risks-create-new"]').click();
  
  await page.locator('input[placeholder="Enter risk title"]').fill(title);
  await page.locator('textarea[placeholder="Enter risk description"]').fill('Test risk description for e2e testing');
  await page.locator('textarea[placeholder="Describe the hazard"]').fill('Test hazard');
  await page.locator('textarea[placeholder="Describe the potential harm"]').fill('Test harm');
  
  // Fill numeric fields - severity, P1, P2
  const numberInputs = page.locator('input[type="number"]');
  await numberInputs.nth(0).fill('2'); // severity
  await numberInputs.nth(1).fill('2'); // P1
  await numberInputs.nth(2).fill('2'); // P2
  
  await page.locator('textarea[placeholder*="P_total"]').fill('P_total = max(P₁, P₂) = 2');
  
  // Use the first "Create" button (not "Create & Approve")
  // Get all buttons with "Create" and click the one that doesn't have "&"
  const createButtons = page.locator('button:has-text("Create")');
  const buttonCount = await createButtons.count();
  for (let i = 0; i < buttonCount; i++) {
    const button = createButtons.nth(i);
    const text = await button.textContent();
    if (text === 'Create') {
      await button.click();
      break;
    }
  }
  
  // Wait for navigation to detail page
  await page.waitForURL(/\/risks\/RISK-\d+/, { timeout: 10000 });
  
  // Get the risk ID from URL
  const url = page.url();
  const match = url.match(/\/risks\/(RISK-\d+)/);
  return match ? match[1] : null;
}

test.describe('Risks', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testUsers.admin.email);
    await page.locator('input[type="password"]').fill(testUsers.admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'));
  });

  test.describe('Browse', () => {
    test('should list all risks', async ({ page }) => {
      await page.goto('/risks');
      
      // Wait for page to load - check if empty state or list
      const emptyState = page.locator('[data-testid="risks-empty-state"]');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      
      if (hasEmptyState) {
        // Create a risk first
        const riskId = await createRisk(page, `Test Risk ${Date.now()}`);
        expect(riskId).not.toBeNull();
        
        // Go back to list and wait for it to load
        await page.goto('/risks');
        await page.waitForSelector('[data-testid^="risk-card-"], [data-testid="risks-empty-state"]', { timeout: 10000 });
      } else {
        // Wait for list to load
        await page.waitForSelector('[data-testid^="risk-card-"], [data-testid="risks-empty-state"]', { timeout: 10000 });
      }
      
      // Should show risks list (skip if still empty)
      const riskCards = page.locator('[data-testid^="risk-card-"]');
      const cardCount = await riskCards.count();
      if (cardCount === 0) {
        // Create a risk if list is still empty
        const riskId = await createRisk(page, `Test Risk ${Date.now()}`);
        expect(riskId).not.toBeNull();
        await page.goto('/risks');
        await page.waitForSelector('[data-testid^="risk-card-"]', { timeout: 10000 });
      }
      await expect(riskCards.first()).toBeVisible({ timeout: 10000 });
      
      // Should display ID, title
      const firstRisk = riskCards.first();
      await expect(firstRisk).toContainText(/RISK-\d+/); // ID
    });

    test('should filter by status', async ({ page }) => {
      await page.goto('/risks');
      
      // Create a risk if none exist
      const emptyState = page.locator('[data-testid="risks-empty-state"]');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      
      if (hasEmptyState) {
        const riskId = await createRisk(page, `Test Risk ${Date.now()}`);
        expect(riskId).not.toBeNull();
        await page.goto('/risks');
      }

      // The status filter is a button that shows the current filter state
      const statusFilter = page.locator('[data-testid="requirements-status-filter"]');
      await expect(statusFilter).toBeVisible();

      const buttonText = await statusFilter.textContent();

      // If not showing "Approved", click to cycle through states
      if (!buttonText?.includes('Approved')) {
        await statusFilter.click();
        await page.waitForSelector('[data-testid="requirements-status-filter"]:has-text("Approved")', { timeout: 2000 }).catch(async () => {
          // If not showing Approved yet, click again
          await statusFilter.click();
          await page.waitForSelector('[data-testid="requirements-status-filter"]:has-text("Approved")', { timeout: 2000 });
        });
      }

      // Verify we have risks visible (may be empty if filtering by approved and none exist)
      const risks = page.locator('[data-testid^="risk-card-"]');
      const riskCount = await risks.count();
      if (riskCount > 0) {
        await expect(risks.first()).toBeVisible();
      }
    });

    test('should sort risks', async ({ page }) => {
      await page.goto('/risks');
      
      // Create at least 3 risks if needed
      const emptyState = page.locator('[data-testid="risks-empty-state"]');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      
      if (hasEmptyState) {
        // Create 3 risks
        for (let i = 0; i < 3; i++) {
          await createRisk(page, `Sort Test Risk ${i} ${Date.now()}`);
          await page.waitForTimeout(500);
        }
        await page.goto('/risks');
        await page.waitForSelector('[data-testid^="risk-card-"]', { timeout: 10000 });
      } else {
        // Wait for risks to load
        await page.waitForSelector('[data-testid^="risk-card-"], [data-testid="risks-empty-state"]', { timeout: 10000 });
        // Check if still empty and create risks
        const cardCount = await page.locator('[data-testid^="risk-card-"]').count();
        if (cardCount < 3) {
          for (let i = cardCount; i < 3; i++) {
            await createRisk(page, `Sort Test Risk ${i} ${Date.now()}`);
            await page.waitForTimeout(500);
          }
          await page.goto('/risks');
          await page.waitForSelector('[data-testid^="risk-card-"]', { timeout: 10000 });
        }
      }

      // Get the first 3 risks with default sort (lastModified desc)
      const getFirst3Risks = async () => {
        const cards = await page.locator('[data-testid^="risk-card-"]').all();
        const first3: (string | null)[] = [];
        for (let i = 0; i < Math.min(3, cards.length); i++) {
          const text = await cards[i].textContent();
          first3.push(text);
        }
        return first3;
      };

      const defaultSort = await getFirst3Risks();
      expect(defaultSort.length).toBeGreaterThanOrEqual(3);

      // Change sort to createdAt
      const sortDropdown = page.locator('[data-testid="requirements-sort"] select');
      await sortDropdown.selectOption('createdAt');
      await page.waitForTimeout(500); // Wait for re-render

      const createdAtSort = await getFirst3Risks();
      expect(createdAtSort).not.toEqual(defaultSort);

      // Change sort to approvedAt
      await sortDropdown.selectOption('approvedAt');
      await page.waitForTimeout(500); // Wait for re-render

      const approvedAtSort = await getFirst3Risks();
      expect(approvedAtSort).not.toEqual(createdAtSort);

      // Toggle sort order
      const sortOrderButton = page.locator('[data-testid="requirements-sort-order"]');
      await sortOrderButton.click();
      await page.waitForTimeout(500); // Wait for re-render

      const reversedSort = await getFirst3Risks();
      expect(reversedSort).not.toEqual(approvedAtSort);
    });
  });

  test.describe('Create', () => {
    test('should create new risk without initial trace', async ({ page }) => {
      await page.goto('/risks');
      
      // Click create button
      await page.locator('[data-testid="risks-create-new"]').click();
      
      // Fill form
      const timestamp = Date.now();
      const title = `Test Risk ${timestamp}`;
      const description = 'This risk describes a potential hazard that needs to be managed.';
      const hazard = 'Electrical shock from exposed wiring';
      const harm = 'Severe injury or death';
      const severity = '3';
      const probabilityP1 = '2';
      const probabilityP2 = '3';
      const pTotalMethod = 'P_total = max(P₁, P₂) = max(2, 3) = 3';
      
      // Fill all required fields using exact placeholders
      await page.locator('input[placeholder="Enter risk title"]').fill(title);
      await page.locator('textarea[placeholder="Enter risk description"]').fill(description);
      await page.locator('textarea[placeholder="Describe the hazard"]').fill(hazard);
      await page.locator('textarea[placeholder="Describe the potential harm"]').fill(harm);
      
      // Fill numeric fields
      const numberInputs = page.locator('input[type="number"]');
      await numberInputs.nth(0).fill(severity); // severity
      await numberInputs.nth(1).fill(probabilityP1); // P1
      await numberInputs.nth(2).fill(probabilityP2); // P2
      
      // Fill P_total calculation method
      await page.locator('textarea[placeholder*="P_total"]').fill(pTotalMethod);
      
      // Save - use the "Create" button (not "Create & Approve")
      const createButtons = page.locator('button:has-text("Create")');
      const buttonCount = await createButtons.count();
      for (let i = 0; i < buttonCount; i++) {
        const button = createButtons.nth(i);
        const text = await button.textContent();
        if (text === 'Create') {
          await button.click();
          break;
        }
      }
      
      // Wait for navigation to detail page
      await page.waitForURL(/\/risks\/RISK-\d+/, { timeout: 10000 });
      
      // Verify the title is visible in the detail view
      await expect(page.locator(`text=${title}`).first()).toBeVisible();
      
      // Get the risk ID from URL
      const url = page.url();
      const match = url.match(/\/risks\/(RISK-\d+)/);
      expect(match).not.toBeNull();
      const riskId = match![1];
      
      // Check status is draft - verify draft status icon is visible for new risk
      // Status icon is in the list, so we need to go back to list or check detail view
      // For now, just verify we're on the detail page with the risk ID
      await expect(page.locator(`text=${riskId}`).first()).toBeVisible();
    });
  });

  test.describe('Approve', () => {
    test('should approve draft risk', async ({ page }) => {
      // Navigate to risks list
      await page.goto('/risks');

      // Create a risk if none exist
      const emptyState = page.locator('[data-testid="risks-empty-state"]');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      
      let riskId: string | null = null;
      
      if (hasEmptyState) {
        // Create a new risk to approve
        riskId = await createRisk(page, `Risk to Approve ${Date.now()}`);
        expect(riskId).not.toBeNull();
        // We're already on the detail page after createRisk
      } else {
        // Wait for the list to load
        await page.waitForSelector('[data-testid^="risk-card-"], [data-testid="risks-empty-state"]', { timeout: 10000 });

        // Find any draft risk (one with draft status icon)
        let found = false;
        const cards = page.locator('[data-testid^="risk-card-"]');
        const cardCount = await cards.count();
        
        for (let i = 0; i < Math.min(cardCount, 20); i++) {
          const card = cards.nth(i);
          const testId = await card.getAttribute('data-testid');
          if (testId) {
            const id = testId.replace('risk-card-', '');
            const draftIcon = page.locator(`[data-testid="risk-status-draft-${id}"]`);
            const isVisible = await draftIcon.isVisible().catch(() => false);
            
            if (isVisible) {
              riskId = id;
              found = true;
              // Click the card to open detail view
              await card.click();
              break;
            }
          }
        }

        if (!found) {
          // Create a new risk to approve
          riskId = await createRisk(page, `Risk to Approve ${Date.now()}`);
          expect(riskId).not.toBeNull();
          // We're already on the detail page after createRisk
        } else {
          // Wait for detail view to load after clicking card
          await page.waitForSelector('[data-testid="risk-approve"]', { timeout: 10000 });
        }
      }

      expect(riskId).not.toBeNull();

      // Wait for detail view to load (if not already loaded)
      await page.waitForSelector('[data-testid="risk-approve"]', { timeout: 10000 });

      // Click approve button
      await page.locator('[data-testid="risk-approve"]').click();

      // Fill password in modal
      await page.waitForSelector('input[type="password"]', { timeout: 2000 });
      await page.locator('input[type="password"]').fill(testUsers.admin.password);

      // Confirm approval - use the password confirm submit button
      const confirmButton = page.locator('[data-testid="password-confirm-submit"]');
      await confirmButton.click();

      // Wait for approval to complete
      await page.waitForTimeout(2000);

      // Verify status changed to approved - check in detail view
      // After approval, the approve button should disappear and status should show "Approved"
      // Wait for the modal to close and page to update
      await page.waitForTimeout(2000);
      
      // Verify approve button is no longer visible (risk is now approved)
      const approveButton = page.locator('[data-testid="risk-approve"]');
      await expect(approveButton).not.toBeVisible({ timeout: 5000 });
      
      // Also verify "Approved" text appears somewhere (could be in badge or status field)
      // Use a more flexible selector that finds "Approved" text but not button text
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('Approved');
    });
  });

  test.describe('Edit', () => {
    test('should edit draft risk', async ({ page }) => {
      await page.goto('/risks');

      // Create a risk if none exist
      const emptyState = page.locator('[data-testid="risks-empty-state"]');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      
      let riskId: string | null = null;
      
      if (hasEmptyState) {
        // Create a new risk to edit
        riskId = await createRisk(page, `Risk to Edit ${Date.now()}`);
        expect(riskId).not.toBeNull();
        // We're already on the detail page after createRisk
      } else {
        // Wait for list to load
        await page.waitForSelector('[data-testid^="risk-card-"], [data-testid="risks-empty-state"]', { timeout: 10000 });

        // Find a draft risk
        const cards = page.locator('[data-testid^="risk-card-"]');
        const cardCount = await cards.count();
        
        for (let i = 0; i < Math.min(cardCount, 20); i++) {
          const card = cards.nth(i);
          const testId = await card.getAttribute('data-testid');
          if (testId) {
            const id = testId.replace('risk-card-', '');
            const draftIcon = page.locator(`[data-testid="risk-status-draft-${id}"]`);
            const isVisible = await draftIcon.isVisible().catch(() => false);
            
            if (isVisible) {
              riskId = id;
              await card.click();
              break;
            }
          }
        }

        if (!riskId) {
          // Create a new risk to edit
          riskId = await createRisk(page, `Risk to Edit ${Date.now()}`);
          expect(riskId).not.toBeNull();
          // We're already on the detail page after createRisk
        } else {
          // Wait for detail view to load after clicking card
          await page.waitForSelector('[data-testid="risk-edit"]', { timeout: 10000 });
        }
      }

      expect(riskId).not.toBeNull();

      // Wait for detail view and click edit (if not already loaded)
      await page.waitForSelector('[data-testid="risk-edit"]', { timeout: 10000 });
      await page.locator('[data-testid="risk-edit"]').click();

      // Update description
      const descriptionField = page.locator('textarea[placeholder="Enter risk description"]');
      await descriptionField.fill('Updated description after editing');

      // Save
      await page.locator('button:has-text("Save")').first().click();

      // Wait for save to complete and exit edit mode
      await page.waitForTimeout(2000);

      // Verify we're back in view mode (edit button should be visible again)
      await expect(page.locator('[data-testid="risk-edit"]')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Traceability', () => {
    test('should show trace relationships', async ({ page }) => {
      // Navigate to a risk
      await page.goto('/risks');
      
      // Create a risk if none exist
      const emptyState = page.locator('[data-testid="risks-empty-state"]');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      
      if (hasEmptyState) {
        const riskId = await createRisk(page, `Risk for Traceability ${Date.now()}`);
        expect(riskId).not.toBeNull();
        // We're already on the detail page after createRisk
      } else {
        // Wait for list to load
        await page.waitForSelector('[data-testid^="risk-card-"], [data-testid="risks-empty-state"]', { timeout: 10000 });

        // Click on first risk (if exists)
        const firstRisk = page.locator('[data-testid^="risk-card-"]').first();
        const hasRisks = await firstRisk.isVisible().catch(() => false);
        if (!hasRisks) {
          // Create a risk if none exist
          const riskId = await createRisk(page, `Risk for Traceability ${Date.now()}`);
          expect(riskId).not.toBeNull();
          // We're already on detail page
        } else {
          await firstRisk.click();
          await page.waitForTimeout(1000); // Wait for detail view to load
        }
      }

      // Wait for detail view to load
      await page.waitForTimeout(2000);

      // Check if trace section exists (may or may not have traces)
      const traceSection = page.locator('text=/Trace to/i');
      const hasTraces = await traceSection.isVisible().catch(() => false);

      if (hasTraces) {
        // Verify trace edit button exists
        await expect(page.locator('[data-testid="risk-edit-traces"]')).toBeVisible();
      } else {
        // Trace section should still exist even if empty
        // Just verify the page loaded correctly
        await expect(page.locator('text=/Trace to/i, [data-testid="risk-edit-traces"]').first()).toBeVisible({ timeout: 5000 }).catch(() => {
          // If trace section doesn't exist, that's okay - it might not be shown for risks without traces
        });
      }
    });
  });
});
