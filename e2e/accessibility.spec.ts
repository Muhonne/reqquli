import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { testUsers } from './fixtures/test-data';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testUsers.admin.email);
    await page.locator('input[type="password"]').fill(testUsers.admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'));
  });

  test.describe('Authentication Pages', () => {
    test('login page should be accessible', async ({ page }) => {
      // Logout first
      await page.locator('[data-testid="nav-logout"]').click();
      await page.waitForURL('/login');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('register page should be accessible', async ({ page }) => {
      // Logout first
      await page.locator('[data-testid="nav-logout"]').click();
      await page.waitForURL('/login');

      // Navigate to register
      await page.goto('/register');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });
  });

  test.describe('User Requirements Views', () => {
    test('user requirements list view should be accessible', async ({ page }) => {
      await page.goto('/user-requirements');
      await page.waitForSelector('[data-testid^="requirement-card-"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('user requirements detail view should be accessible', async ({ page }) => {
      await page.goto('/user-requirements/UR-1');
      await page.waitForSelector('[data-testid="requirement-title-readonly"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('user requirements create view should be accessible', async ({ page }) => {
      await page.goto('/user-requirements/new');
      await page.waitForSelector('[data-testid="requirement-title"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('user requirements edit view should be accessible', async ({ page }) => {
      await page.goto('/user-requirements/UR-30');
      await page.waitForSelector('[data-testid="requirement-title-readonly"]');

      // Click edit to enter edit mode
      await page.locator('[data-testid="requirement-edit"]').click();
      await page.waitForSelector('[data-testid="requirement-save"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('user requirements with traces should be accessible', async ({ page }) => {
      // UR-1 has multiple traces
      await page.goto('/user-requirements/UR-1');
      await page.waitForSelector('[data-testid="requirement-title-readonly"]');
      // Wait for traces to load
      await page.waitForTimeout(1000);

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });
  });

  test.describe('System Requirements Views', () => {
    test('system requirements list view should be accessible', async ({ page }) => {
      await page.goto('/system-requirements');
      await page.waitForSelector('[data-testid^="requirement-card-"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('system requirements detail view should be accessible', async ({ page }) => {
      await page.goto('/system-requirements/SR-1');
      await page.waitForSelector('[data-testid="requirement-title-readonly"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('system requirements create view should be accessible', async ({ page }) => {
      await page.goto('/system-requirements/new');
      await page.waitForSelector('[data-testid="requirement-title"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('system requirements edit view should be accessible', async ({ page }) => {
      await page.goto('/system-requirements/SR-30');
      await page.waitForSelector('[data-testid="requirement-title-readonly"]');

      // Click edit to enter edit mode
      await page.locator('[data-testid="requirement-edit"]').click();
      await page.waitForSelector('[data-testid="requirement-save"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('system requirements with traces should be accessible', async ({ page }) => {
      // SR-95 has upstream traces
      await page.goto('/system-requirements/SR-95');
      await page.waitForSelector('[data-testid="requirement-title-readonly"]');
      // Wait for traces to load
      await page.waitForTimeout(1000);

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });
  });

  test.describe('Traceability Views', () => {
    test('traceability page should be accessible', async ({ page }) => {
      await page.goto('/');
      // Wait for the h1 element to appear
      await page.waitForSelector('h1:has-text("Requirements Traceability")', { timeout: 10000 });

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });
  });

  test.describe('Modals and Overlays', () => {
    test('password confirmation modal should be accessible', async ({ page }) => {
      // Navigate to an approved requirement and try to edit
      await page.goto('/user-requirements/UR-1');
      await page.waitForSelector('[data-testid="requirement-edit"]');
      await page.locator('[data-testid="requirement-edit"]').click();

      // Password modal should appear
      await page.waitForSelector('input[type="password"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);

      // Close modal
      await page.keyboard.press('Escape');
    });

    test('trace edit modal should be accessible', async ({ page }) => {
      await page.goto('/user-requirements/UR-1');
      await page.waitForSelector('[data-testid="requirement-edit-traces"]');
      await page.locator('[data-testid="requirement-edit-traces"]').click();

      // Trace modal should appear
      await page.waitForSelector('[data-testid="trace-modal-close"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);

      // Close modal
      await page.locator('[data-testid="trace-modal-close"]').click();
    });
  });

  test.describe('Filter and Sort Controls', () => {
    test('user requirements filters should be accessible', async ({ page }) => {
      await page.goto('/user-requirements');
      await page.waitForSelector('[data-testid="requirements-status-filter"]');

      // Test with filter dropdown open
      await page.locator('[data-testid="requirements-status-filter"]').click();
      await page.waitForTimeout(300);

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('system requirements filters should be accessible', async ({ page }) => {
      await page.goto('/system-requirements');
      await page.waitForSelector('[data-testid="requirements-status-filter"]');

      // Test with filter dropdown open
      await page.locator('[data-testid="requirements-status-filter"]').click();
      await page.waitForTimeout(300);

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });
  });

  test.describe('Empty States', () => {
    test('empty search results should be accessible', async ({ page }) => {
      await page.goto('/user-requirements');
      await page.waitForSelector('[data-testid="requirements-search"]');

      // Search for something that won't exist
      await page.locator('[data-testid="requirements-search"]').fill('xyzabc123notfound');
      await page.waitForTimeout(500);

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });
  });

  test.describe('Responsive Views', () => {
    test('mobile view should be accessible', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/user-requirements');
      await page.waitForSelector('[data-testid^="requirement-card-"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });

    test('tablet view should be accessible', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/system-requirements');
      await page.waitForSelector('[data-testid^="requirement-card-"]');

      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toEqual([]);
    });
  });
});