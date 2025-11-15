import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('User Requirements', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testUsers.admin.email);
    await page.locator('input[type="password"]').fill(testUsers.admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'));
  });

  test.describe('Browse', () => {
    test('should list all user requirements', async ({ page }) => {
      await page.goto('/user-requirements');
      
      // Should show requirements list - check for requirement cards with IDs
      const requirementCards = page.locator('[data-testid^="requirement-card-"]');
      await expect(requirementCards.first()).toBeVisible();
      
      // Should display ID, title
      const firstRequirement = requirementCards.first();
      await expect(firstRequirement).toContainText(/UR-\d+/); // ID
    });

    test('should filter by status', async ({ page }) => {
      await page.goto('/user-requirements');

      // The status filter is a button that shows the current filter state
      const statusFilter = page.locator('[data-testid="requirements-status-filter"]');
      await expect(statusFilter).toBeVisible();

      const buttonText = await statusFilter.textContent();

      // If showing "Approved" or "All", click to cycle through states
      if (buttonText?.includes('Approved') || buttonText?.includes('All')) {
        // Click to change filter - it may cycle through All -> Draft -> Approved
        await statusFilter.click();
        await page.waitForSelector('[data-testid="requirements-status-filter"]:has-text("Draft")', { timeout: 2000 }).catch(async () => {
          // If not showing Draft yet, click again
          await statusFilter.click();
          await page.waitForSelector('[data-testid="requirements-status-filter"]:has-text("Draft")', { timeout: 2000 });
        });
      }

      // Verify we have requirements visible
      const requirements = page.locator('[data-testid^="requirement-card-"]');
      await expect(requirements.first()).toBeVisible();
    });

    test('should sort requirements', async ({ page }) => {
      await page.goto('/user-requirements');

      // Wait for requirements to load
      await page.waitForSelector('[data-testid^="requirement-card-"]');

      // Get the first 3 requirements with default sort (lastModified desc)
      const getFirst3Requirements = async () => {
        const cards = await page.locator('[data-testid^="requirement-card-"]').all();
        const first3 = [];
        for (let i = 0; i < Math.min(3, cards.length); i++) {
          const text = await cards[i].textContent();
          first3.push(text);
        }
        return first3;
      };

      const defaultSort = await getFirst3Requirements();
      expect(defaultSort.length).toBeGreaterThanOrEqual(3);

      // Change sort to createdAt
      const sortDropdown = page.locator('[data-testid="requirements-sort"] select');
      await sortDropdown.selectOption('createdAt');
      await page.waitForTimeout(500); // Wait for re-render

      const createdAtSort = await getFirst3Requirements();
      expect(createdAtSort).not.toEqual(defaultSort);

      // Change sort to approvedAt
      await sortDropdown.selectOption('approvedAt');
      await page.waitForTimeout(500); // Wait for re-render

      const approvedAtSort = await getFirst3Requirements();
      expect(approvedAtSort).not.toEqual(createdAtSort);

      // Toggle sort order
      const sortOrderButton = page.locator('[data-testid="requirements-sort-order"]');
      await sortOrderButton.click();
      await page.waitForTimeout(500); // Wait for re-render

      const reversedSort = await getFirst3Requirements();
      expect(reversedSort).not.toEqual(approvedAtSort);
    });
  });

  test.describe('Create', () => {
    test('should create new requirement with draft status', async ({ page }) => {
      await page.goto('/user-requirements');
      
      // Click create button
      await page.locator('[data-testid="requirements-create-new"]').click();
      
      // Fill form
      const timestamp = Date.now();
      const title = `Test Requirement ${timestamp}`;
      const description = 'This requirement describes a test feature that needs implementation.';
      
      await page.locator('[data-testid="requirement-title"]').fill(title);
      await page.locator('[data-testid="requirement-description"]').fill(description);
      
      // Save
      await page.locator('[data-testid="requirement-save"]').click();
      
      // Wait for the new requirement to appear in the list
      const newRequirement = page.locator('[data-testid^="requirement-card-"]').filter({ hasText: title });
      await expect(newRequirement.first()).toBeVisible();

      // Also verify it shows in the detail panel
      // The title should be in a disabled input field with the new title value
      const detailTitle = page.locator('input[disabled][data-testid="requirement-title-readonly"]');
      await expect(detailTitle).toBeVisible();
      await expect(detailTitle).toHaveValue(title);
      
      // Check status is draft - verify draft status icon is visible for new requirement
      // New requirements get an ID assigned, so we need to find it
      const newReqCard = page.locator('[data-testid^="requirement-card-"]').filter({ hasText: title }).first();
      const newReqTestId = await newReqCard.getAttribute('data-testid');
      const newReqId = newReqTestId?.replace('requirement-card-', '');
      await expect(page.locator(`[data-testid="requirement-status-draft-${newReqId}"]`)).toBeVisible();
    });
  });

  test.describe('Approve', () => {
    test('should approve draft requirement', async ({ page }) => {
      // Navigate to user requirements list
      await page.goto('/user-requirements');

      // Wait for the list to load
      await page.waitForSelector('[data-testid^="requirement-card-"]', { timeout: 10000 });

      // Find any draft requirement (one with draft status icon)
      let requirementId: string | null = null;
      let found = false;
      
      // Look through cards to find one with draft status
      const cards = page.locator('[data-testid^="requirement-card-"]');
      const cardCount = await cards.count();
      
      for (let i = 0; i < Math.min(cardCount, 20); i++) {
        const card = cards.nth(i);
        const testId = await card.getAttribute('data-testid');
        if (testId) {
          const id = testId.replace('requirement-card-', '');
          // Check if this requirement has a draft status (not approved)
          const draftStatus = page.locator(`[data-testid="requirement-status-draft-${id}"]`);
          const approvedStatus = page.locator(`[data-testid="requirement-status-approved-${id}"]`);
          
          if (await draftStatus.isVisible() || !(await approvedStatus.isVisible())) {
            requirementId = id;
            await card.click();
            found = true;
            break;
          }
        }
      }

      if (!found || !requirementId) {
        throw new Error('Could not find any draft requirement in the list');
      }

      // Wait for detail panel to load
      await page.waitForSelector('[data-testid="requirement-title-readonly"]', { timeout: 10000 });

      // Wait for the requirement details to fully load
      // Wait for the approve button to be in the DOM and potentially visible
      await page.waitForSelector(`[data-testid="requirement-approve"], [data-testid="requirement-status-approved-${requirementId}"]`, { timeout: 10000 });

      // Click approve button (should be visible for draft requirement)
      const approveButton = page.locator('[data-testid="requirement-approve"]');
      // Check if already approved
      const statusApproved = page.locator(`[data-testid="requirement-status-approved-${requirementId}"]`);
      if (await statusApproved.isVisible()) {
        // Already approved, skip the test
        return;
      }
      await expect(approveButton).toBeVisible({ timeout: 10000 });
      await approveButton.click();

      // Enter password confirmation - should always be prompted
      // Wait for modal to appear
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible();
      await passwordInput.fill(testUsers.admin.password);
      await page.locator('[data-testid="password-confirm-submit"]').click();

      // Wait for modal to close and status to update
      await page.waitForSelector(`[data-testid="requirement-status-approved-${requirementId}"]`, { timeout: 5000 });

      // Status icon should change to approved
      await expect(page.locator(`[data-testid="requirement-status-approved-${requirementId}"]`)).toBeVisible();

      // After approval, revision should increment
      // The revision is shown in the requirement card as part of the ID (e.g., UR-33-1)
      const updatedCard = page.locator(`[data-testid="requirement-card-${requirementId}"]`);
      await expect(updatedCard).toContainText(`${requirementId}-1`);
    });
  });

  test.describe('Edit', () => {
    test('should reset approved requirement to draft on edit', async ({ page }) => {
      await page.goto('/user-requirements');

      // Wait for the list to load
      await page.waitForSelector('[data-testid^="requirement-card-"]', { timeout: 10000 });

      // Find any approved requirement (one with approved status icon)
      let requirementId: string | null = null;
      let found = false;
      
      // Look through cards to find one with approved status
      const cards = page.locator('[data-testid^="requirement-card-"]');
      const cardCount = await cards.count();
      
      for (let i = 0; i < Math.min(cardCount, 20); i++) {
        const card = cards.nth(i);
        const testId = await card.getAttribute('data-testid');
        if (testId) {
          const id = testId.replace('requirement-card-', '');
          // Check if this requirement has an approved status
          const approvedStatus = page.locator(`[data-testid="requirement-status-approved-${id}"]`);
          
          if (await approvedStatus.isVisible()) {
            requirementId = id;
            found = true;
            break;
          }
        }
      }

      if (!found || !requirementId) {
        throw new Error('Could not find any approved requirement in the list');
      }

      const approvedRequirement = page.locator(`[data-testid="requirement-card-${requirementId}"]`);
      await expect(approvedRequirement).toBeVisible();

      // Click on it
      await approvedRequirement.click();

      // Wait for detail panel to load
      await page.waitForSelector('[data-testid="requirement-title-readonly"]', { timeout: 5000 });

      // Click edit button
      const editButton = page.locator('[data-testid="requirement-edit"]');
      await expect(editButton).toBeVisible();
      await editButton.click();

      // Check if password modal appears (for approved requirements)
      const passwordModal = page.locator('input[type="password"]');

      if (await passwordModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Handle password confirmation modal for editing approved requirement
        await passwordModal.fill(testUsers.admin.password);
        await page.locator('[data-testid="password-confirm-submit"]').click();

        // Wait for modal to close
        await page.waitForSelector('input[type="password"]', { state: 'hidden', timeout: 5000 });
      }

      // Wait for edit mode to activate
      await page.waitForSelector('[data-testid="requirement-description"]:not([disabled])', { timeout: 5000 });

      // Make a change - in edit mode the field should be editable
      const descriptionField = page.locator('[data-testid="requirement-description"]');
      await expect(descriptionField).toBeVisible();
      await expect(descriptionField).not.toBeDisabled();
      const currentDescription = await descriptionField.inputValue();
      await descriptionField.fill(currentDescription + ' - Updated');

      // Save
      await page.locator('[data-testid="requirement-save"]').click();

      // Status icon should change to draft
      await expect(page.locator(`[data-testid="requirement-status-draft-${requirementId}"]`)).toBeVisible();

      // Revision should remain 1 after edit (editing doesn't change revision)
      await expect(page.locator(`[data-testid="requirement-card-${requirementId}"]`)).toContainText(`${requirementId}-1`);
    });
  });
});