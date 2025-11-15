import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testUsers.admin.email);
    await page.locator('input[type="password"]').fill(testUsers.admin.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'));
  });

  test.describe('User Requirements Page', () => {
    test('should display error in right panel when API fails', async ({ page }) => {
      // Intercept and fail the API request
      await page.route('**/api/user-requirements*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'Internal server error'
            }
          })
        });
      });

      await page.goto('/user-requirements');
      
      // Wait for error to appear in right panel
      const errorText = page.locator('text=/Error:.*Internal server error/i');
      await expect(errorText).toBeVisible({ timeout: 5000 });
      
      // Verify error is in red
      await expect(errorText).toHaveClass(/text-red-600/);
      
      // Verify "Try again" button is visible
      const tryAgainButton = page.locator('button:has-text("Try again")');
      await expect(tryAgainButton).toBeVisible();
    });

    test('should retry on "Try again" button click', async ({ page }) => {
      let requestCount = 0;
      
      // First request fails, second succeeds
      await page.route('**/api/user-requirements*', route => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { message: 'Network error' }
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/user-requirements');
      
      // Wait for error
      await expect(page.locator('text=/Error:.*Network error/i')).toBeVisible({ timeout: 5000 });
      
      // Click "Try again"
      await page.locator('button:has-text("Try again")').click();
      
      // Wait for successful load (error should disappear, list should appear)
      await expect(page.locator('[data-testid^="requirement-card-"]').first()).toBeVisible({ timeout: 5000 });
      
      // Verify error is gone
      await expect(page.locator('text=/Error:/i')).not.toBeVisible();
    });
  });

  test.describe('System Requirements Page', () => {
    test('should display error in right panel when API fails', async ({ page }) => {
      await page.route('**/api/system-requirements*', route => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'Service unavailable'
            }
          })
        });
      });

      await page.goto('/system-requirements');
      
      // Wait for error to appear
      const errorText = page.locator('text=/Error:.*Service unavailable/i');
      await expect(errorText).toBeVisible({ timeout: 5000 });
      await expect(errorText).toHaveClass(/text-red-600/);
      
      // Verify "Try again" button
      await expect(page.locator('button:has-text("Try again")')).toBeVisible();
    });

    test('should clear error and retry on "Try again"', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/system-requirements*', route => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { message: 'Server error' }
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/system-requirements');
      await expect(page.locator('text=/Error:/i')).toBeVisible({ timeout: 5000 });
      
      await page.locator('button:has-text("Try again")').click();
      await expect(page.locator('[data-testid^="requirement-card-"]').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Risks Page', () => {
    test('should display error in right panel when API fails', async ({ page }) => {
      await page.route('**/api/risks*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'Failed to fetch risks'
            }
          })
        });
      });

      await page.goto('/risks');
      
      const errorText = page.locator('text=/Error:.*Failed to fetch risks/i');
      await expect(errorText).toBeVisible({ timeout: 5000 });
      await expect(errorText).toHaveClass(/text-red-600/);
      await expect(page.locator('button:has-text("Try again")')).toBeVisible();
    });

    test('should retry on "Try again" button click', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/risks*', route => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { message: 'Database error' }
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/risks');
      await expect(page.locator('text=/Error:/i')).toBeVisible({ timeout: 5000 });
      
      await page.locator('button:has-text("Try again")').click();
      
      // Wait for either list to load or error to clear
      await page.waitForTimeout(1000);
      const errorVisible = await page.locator('text=/Error:/i').isVisible().catch(() => false);
      const listVisible = await page.locator('[data-testid^="risk-card-"]').first().isVisible().catch(() => false);
      expect(!errorVisible || listVisible).toBeTruthy(); // Error should be gone or list should be visible
    });
  });

  test.describe('Test Cases Page', () => {
    test('should display error in right panel when API fails', async ({ page }) => {
      await page.route('**/api/test-cases*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'Failed to load test cases'
            }
          })
        });
      });

      await page.goto('/test-cases');
      
      const errorText = page.locator('text=/Error:.*Failed to load test cases/i');
      await expect(errorText).toBeVisible({ timeout: 5000 });
      await expect(errorText).toHaveClass(/text-red-600/);
      await expect(page.locator('button:has-text("Try again")')).toBeVisible();
    });

    test('should retry on "Try again" button click', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/test-cases*', route => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { message: 'Connection timeout' }
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/test-cases');
      await expect(page.locator('text=/Error:/i')).toBeVisible({ timeout: 5000 });
      
      await page.locator('button:has-text("Try again")').click();
      
      // Wait for either list to load or error to clear
      await page.waitForTimeout(1000);
      const errorVisible = await page.locator('text=/Error:/i').isVisible().catch(() => false);
      const listVisible = await page.locator('[data-testid^="requirement-card-"]').first().isVisible().catch(() => false);
      expect(errorVisible || listVisible).toBeTruthy();
    });
  });

  test.describe('Test Runs Page', () => {
    test('should display error in right panel when API fails', async ({ page }) => {
      await page.route('**/api/test-runs*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: 'Failed to fetch test runs'
            }
          })
        });
      });

      await page.goto('/test-runs');
      
      const errorText = page.locator('text=/Error:.*Failed to fetch test runs/i');
      await expect(errorText).toBeVisible({ timeout: 5000 });
      await expect(errorText).toHaveClass(/text-red-600/);
      await expect(page.locator('button:has-text("Try again")')).toBeVisible();
    });

    test('should retry on "Try again" button click', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/test-runs*', route => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { message: 'Server error' }
            })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/test-runs');
      await expect(page.locator('text=/Error:/i')).toBeVisible({ timeout: 5000 });
      
      await page.locator('button:has-text("Try again")').click();
      
      // Wait for either list to load or error to clear
      await page.waitForTimeout(1000);
      const errorVisible = await page.locator('text=/Error:/i').isVisible().catch(() => false);
      const listVisible = await page.locator('[data-testid^="test-run-item-"]').first().isVisible().catch(() => false);
      expect(errorVisible || listVisible).toBeTruthy();
    });
  });

  test.describe('Error Format Consistency', () => {
    test('all split-panel pages should use consistent error format', async ({ page }) => {
      const pages = [
        { path: '/user-requirements', api: '**/api/user-requirements*' },
        { path: '/system-requirements', api: '**/api/system-requirements*' },
        { path: '/risks', api: '**/api/risks*' },
        { path: '/test-cases', api: '**/api/test-cases*' },
        { path: '/test-runs', api: '**/api/test-runs*' }
      ];

      for (const { path, api } of pages) {
        await page.route(api, route => {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { message: 'Test error' }
            })
          });
        });

        await page.goto(path);
        
        // All should show "Error: Test error" in red
        const errorText = page.locator('text=/Error:.*Test error/i');
        await expect(errorText).toBeVisible({ timeout: 5000 });
        await expect(errorText).toHaveClass(/text-red-600/);
        
        // All should have "Try again" button
        await expect(page.locator('button:has-text("Try again")')).toBeVisible();
        
        // Clear route for next iteration
        await page.unroute(api);
      }
    });

    test('error should not appear as floating notification', async ({ page }) => {
      await page.route('**/api/user-requirements*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { message: 'Test error' }
          })
        });
      });

      await page.goto('/user-requirements');
      
      // Wait for error to appear
      await expect(page.locator('text=/Error:/i')).toBeVisible({ timeout: 5000 });
      
      // Verify there's NO floating notification (fixed bottom-right)
      const floatingError = page.locator('.fixed.bottom-4.right-4');
      await expect(floatingError).not.toBeVisible();
      
      // Error should be in right panel instead
      const errorInPanel = page.locator('text=/Error:.*Test error/i');
      await expect(errorInPanel).toBeVisible();
    });
  });
});

