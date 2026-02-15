import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { TEST_EMAIL } from './auth.setup';

test.describe('Authentication Flows', () => {
  test.describe('Sign Up / Sign In', () => {
    test('user can view auth page', async ({ page }) => {
      await page.goto('/auth');

      // Verify the auth page loads
      await expect(page.locator('text=Welcome to Pink Beam')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button:has-text("Continue")')).toBeVisible();
    });

    test('user can enter email and request OTP code', async ({ page }) => {
      await page.goto('/auth');

      // Fill in email
      const testEmail = `test-e2e-${Date.now()}@example.com`;
      await page.fill('input[type="email"]', testEmail);

      // Click continue
      await page.click('button:has-text("Continue")');

      // Verify OTP entry step appears
      await expect(page.getByText('Enter your code')).toBeVisible({ timeout: 15000 });
    });

    test('user sees validation error for invalid email', async ({ page }) => {
      await page.goto('/auth');

      // Fill in invalid email
      await page.fill('input[type="email"]', 'not-an-email');
      await page.click('button:has-text("Continue")');

      // Verify error message
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    });

    test('auth page has back to home link', async ({ page }) => {
      await page.goto('/auth');

      // Click back to home
      await page.click('text=Back to home');

      // Verify navigation to home
      await expect(page).toHaveURL('/');
    });

    test('complete OTP login flow', async ({ page }) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      test.skip(!supabaseUrl || !supabaseServiceKey, 'Requires Supabase service role key');

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      await page.goto('/auth');

      // Enter the persistent test email
      await page.getByLabel('Email address').fill(TEST_EMAIL);
      await page.getByRole('button', { name: 'Continue' }).click();

      // Wait for OTP step
      await expect(page.getByText('Enter your code')).toBeVisible({ timeout: 15000 });

      // Generate OTP via admin API
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: TEST_EMAIL,
      });
      expect(linkError).toBeNull();

      const otp = linkData!.properties.email_otp;
      expect(otp).toBeTruthy();

      // Fill OTP digits
      const otpInputs = page.locator('input[inputmode="numeric"]');
      for (let i = 0; i < 6; i++) {
        await otpInputs.nth(i).fill(otp![i]);
      }

      // Submit
      await page.getByRole('button', { name: 'Verify & Sign In' }).click();

      // Should redirect to portal
      await page.waitForURL('**/portal**', { timeout: 30000 });
      await expect(page).toHaveURL(/\/portal/);
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
