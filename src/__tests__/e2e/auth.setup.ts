import { test as setup, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const TEST_EMAIL = 'e2e-test@pinkbeam-test.com';
export const STORAGE_STATE = '.playwright/.auth/user.json';

/**
 * Playwright setup project: authenticates a test user via the real OTP flow
 * and saves the resulting session cookies to storageState for dependent tests.
 *
 * Flow:
 * 1. Ensure a confirmed auth user exists (admin API)
 * 2. Navigate to /auth, enter email, click Continue
 * 3. Retrieve the OTP via admin.generateLink (bypasses email delivery)
 * 4. Enter OTP in the UI, verify, wait for redirect to /portal
 * 5. Save storageState so other tests reuse the session
 */
setup('authenticate', async ({ page }) => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'E2E auth setup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Ensure test auth user exists (idempotent) ---
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const existingUser = users?.find((u) => u.email === TEST_EMAIL);

  if (!existingUser) {
    const { error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create test user: ${error.message}`);
  }

  // --- Authenticate via the real browser OTP flow ---
  await page.goto('/auth');

  // Enter email
  await page.getByLabel('Email address').fill(TEST_EMAIL);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Wait for the OTP step to appear (signInWithOtp must complete first)
  await expect(page.getByText('Enter your code')).toBeVisible({ timeout: 15000 });

  // Generate a valid OTP via admin API (replaces the emailed one)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_EMAIL,
  });
  if (linkError) throw new Error(`Failed to generate OTP: ${linkError.message}`);

  const otp = linkData.properties.email_otp;
  if (!otp) throw new Error('No OTP returned from admin.generateLink');

  // Fill each OTP digit into the individual inputs
  const otpInputs = page.locator('input[inputmode="numeric"]');
  await otpInputs.first().waitFor({ state: 'visible' });
  for (let i = 0; i < 6; i++) {
    await otpInputs.nth(i).fill(otp[i]);
  }

  // Submit OTP
  await page.getByRole('button', { name: 'Verify & Sign In' }).click();

  // Wait for redirect to portal (/api/auth/initialize creates tenant on first run)
  await page.waitForURL('**/portal**', { timeout: 30000 });

  // Persist auth cookies for dependent test projects
  await page.context().storageState({ path: STORAGE_STATE });
});
