import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.describe('Sign Up / Sign In', () => {
    test('user can view auth page', async ({ page }) => {
      await page.goto('/auth');
      
      // Verify the auth page loads
      await expect(page.locator('text=Welcome to Pink Beam')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button:has-text("Continue")')).toBeVisible();
    });

    test('user can enter email and request magic link', async ({ page }) => {
      await page.goto('/auth');
      
      // Fill in email
      const testEmail = `test-e2e-${Date.now()}@example.com`;
      await page.fill('input[type="email"]', testEmail);
      
      // Click continue
      await page.click('button:has-text("Continue")');
      
      // Verify success state
      await expect(page.locator('text=Check your email')).toBeVisible();
      await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    });

    test('user sees validation error for invalid email', async ({ page }) => {
      await page.goto('/auth');
      
      // Fill in invalid email
      await page.fill('input[type="email"]', 'not-an-email');
      await page.click('button:has-text("Continue")');
      
      // Verify error message
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    });

    test('user can use different email after success', async ({ page }) => {
      await page.goto('/auth');
      
      // First email
      await page.fill('input[type="email"]', 'first@example.com');
      await page.click('button:has-text("Continue")');
      
      // Wait for success
      await expect(page.locator('text=Check your email')).toBeVisible();
      
      // Click use different email
      await page.click('button:has-text("Use a different email")');
      
      // Verify back to form
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toHaveValue('');
    });

    test('auth page has back to home link', async ({ page }) => {
      await page.goto('/auth');
      
      // Click back to home
      await page.click('text=Back to home');
      
      // Verify navigation to home
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Protected Routes', () => {
    test('unauthenticated user is redirected to auth from portal', async ({ page }) => {
      // Navigate to portal without auth
      await page.goto('/portal');
      
      // Should redirect to auth page with redirect param
      await expect(page).toHaveURL(/\/auth/);
      await expect(page).toHaveURL(/redirect=%2Fportal/);
    });

    test('unauthenticated user is redirected to auth from agents page', async ({ page }) => {
      await page.goto('/portal/agents');
      
      await expect(page).toHaveURL(/\/auth/);
      await expect(page).toHaveURL(/redirect=%2Fportal%2Fagents/);
    });

    test('unauthenticated user is redirected to auth from tasks page', async ({ page }) => {
      await page.goto('/portal/tasks');
      
      await expect(page).toHaveURL(/\/auth/);
      await expect(page).toHaveURL(/redirect=%2Fportal%2Ftasks/);
    });

    test('unauthenticated user is redirected to auth from decisions page', async ({ page }) => {
      await page.goto('/portal/decisions');
      
      await expect(page).toHaveURL(/\/auth/);
      await expect(page).toHaveURL(/redirect=%2Fportal%2Fdecisions/);
    });
  });

  test.describe('Public Routes', () => {
    test('home page is accessible without auth', async ({ page }) => {
      await page.goto('/');
      
      // Should stay on home page
      await expect(page).toHaveURL('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('about page is accessible without auth', async ({ page }) => {
      await page.goto('/about');
      
      await expect(page).toHaveURL('/about');
      await expect(page.locator('body')).toBeVisible();
    });

    test('pricing page is accessible without auth', async ({ page }) => {
      await page.goto('/pricing');
      
      await expect(page).toHaveURL('/pricing');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Auth Callback', () => {
    test('auth callback page handles errors gracefully', async ({ page }) => {
      // Visit callback with invalid hash
      await page.goto('/auth/callback#error=invalid_grant');
      
      // Should handle gracefully (either show error or redirect)
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
