import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should login with verified account credentials', async ({ page }) => {
      await page.goto('/login');
      
      // Fill login form
      await page.locator('input[type="email"]').fill(testUsers.admin.email);
      await page.locator('input[type="password"]').fill(testUsers.admin.password);
      
      // Click submit
      await page.locator('button[type="submit"]').click();
      
      // Should redirect to dashboard
      await page.waitForURL((url) => !url.pathname.includes('/login'));
      expect(page.url()).not.toContain('/login');
    });

    test('should reject invalid password', async ({ page }) => {
      await page.goto('/login');
      
      await page.locator('input[type="email"]').fill(testUsers.admin.email);
      await page.locator('input[type="password"]').fill('wrongpassword');
      await page.locator('button[type="submit"]').click();
      
      // Should show error and stay on login page
      await expect(page.locator('text=/Invalid|incorrect/i')).toBeVisible();
      expect(page.url()).toContain('/login');
    });

    test('should redirect to dashboard after successful login', async ({ page }) => {
      await page.goto('/login');
      
      await page.locator('input[type="email"]').fill(testUsers.admin.email);
      await page.locator('input[type="password"]').fill(testUsers.admin.password);
      await page.locator('button[type="submit"]').click();
      
      // Wait for navigation
      await page.waitForURL((url) => !url.pathname.includes('/login'));
      
      // Should be on dashboard or main page
      expect(page.url()).toMatch(/\/(dashboard|$)/);
    });
  });

  test.describe('Logout', () => {
    test('should logout and redirect to login', async ({ page }) => {
      // First login
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(testUsers.admin.email);
      await page.locator('input[type="password"]').fill(testUsers.admin.password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((url) => !url.pathname.includes('/login'));
      
      // Click logout button
      await page.locator('[data-testid="nav-logout"]').click();
      
      // Should redirect to login
      await page.waitForURL('**/login');
      expect(page.url()).toContain('/login');
    });

    test('should terminate session after logout', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(testUsers.admin.email);
      await page.locator('input[type="password"]').fill(testUsers.admin.password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((url) => !url.pathname.includes('/login'));
      
      // Logout
      await page.locator('[data-testid="nav-logout"]').click();
      await page.waitForURL('**/login');
      
      // Try to access protected page
      await page.goto('/user-requirements');
      
      // Should redirect back to login
      await expect(page).toHaveURL(/.*\/login/);
    });
  });
});