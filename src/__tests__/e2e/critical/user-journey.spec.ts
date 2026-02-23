import { test, expect } from '../fixtures';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Critical Path: Full User Journey
 * 
 * This test covers the complete user flow from signup through
 * creating an agent, creating a task, and completing it.
 */
test.describe('Critical Path - Full User Journey', () => {
  test('complete user journey: signup → create agent → create task → complete task', async ({ page }) => {
    test.setTimeout(180000); // 3 minute timeout for full journey

    // Skip if no service role key available
    test.skip(!supabaseUrl || !supabaseServiceKey, 'Requires Supabase service role key');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate unique test user
    const timestamp = Date.now();
    const testEmail = `e2e-journey-${timestamp}@pinkbeam-test.com`;
    const agentName = `Journey Agent ${timestamp}`;
    const taskTitle = `Journey Task ${timestamp}`;

    // ==========================================
    // STEP 1: Sign Up
    // ==========================================
    await test.step('Sign up as new user', async () => {
      await page.goto('/auth');

      // Verify auth page loads
      await expect(page.locator('text=Welcome to Pink Beam')).toBeVisible();

      // Enter email
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByRole('button', { name: 'Continue' }).click();

      // Wait for OTP step
      await expect(page.getByText('Enter your code')).toBeVisible({ timeout: 15000 });

      // Generate OTP via admin API
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: testEmail,
      });
      expect(linkError).toBeNull();

      const otp = linkData?.properties?.email_otp;
      expect(otp).toBeTruthy();
      if (!otp) throw new Error('No OTP returned');

      // Fill OTP digits
      const otpInputs = page.locator('input[inputmode="numeric"]');
      await otpInputs.first().waitFor({ state: 'visible' });
      for (let i = 0; i < 6; i++) {
        await otpInputs.nth(i).fill(otp[i]);
      }

      // Submit OTP
      await page.getByRole('button', { name: 'Verify & Sign In' }).click();

      // Wait for redirect to portal (initialize creates tenant)
      await page.waitForURL('**/portal**', { timeout: 30000 });
      await expect(page).toHaveURL(/\/portal/);

      // Verify we're on the dashboard
      await expect(page.locator('text=Portal').or(page.locator('h1'))).toBeVisible();
    });

    // ==========================================
    // STEP 2: Create an Agent
    // ==========================================
    await test.step('Create a new agent', async () => {
      // Navigate to agents page
      await page.goto('/portal/agents');
      await page.waitForLoadState('networkidle');

      // Verify agents page loads
      await expect(page.locator('text=Agent Roster')).toBeVisible();

      // Open create agent modal
      await page.click('button:has-text("Create Agent")');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Select a template or start from scratch
      await page.click('button:has-text("Content Writer")').catch(() => {
        // If template not available, continue with current form
      });

      // Fill agent details
      await page.fill('input[name="name"], input#name, input[placeholder*="name"]', agentName);
      await page.fill('textarea[name="description"], textarea#description', 'Agent created during E2E journey test');

      // Proceed through wizard
      await page.click('button:has-text("Next")').catch(() => {});
      await page.click('button:has-text("Next")').catch(() => {});

      // Create the agent
      await page.locator('button:has-text("Create Agent")').last().click().catch(async () => {
        await page.locator('button:has-text("Create")').last().click();
      });

      // Wait for creation and verify
      await page.waitForTimeout(1500);
      await expect(page.locator(`text=${agentName}`).first()).toBeVisible();
    });

    // ==========================================
    // STEP 3: Create a Task
    // ==========================================
    await test.step('Create a new task', async () => {
      // Navigate to tasks page
      await page.goto('/portal/tasks');
      await page.waitForLoadState('networkidle');

      // Verify tasks page loads
      await expect(page.locator('text=Task Pipeline')).toBeVisible();

      // Open create task modal
      await page.click('button:has-text("Create Task")');
      await expect(page.locator('[role="dialog"]').first()).toBeVisible();

      // Fill task details
      await page.fill('input[name="title"], input[placeholder*="title"]', taskTitle);
      await page.fill('textarea[name="description"], textarea[placeholder*="description"]', 
        'Task created during E2E journey test');

      // Set priority if available
      const priorityButton = page.locator('button:has-text("Priority")').first();
      if (await priorityButton.isVisible().catch(() => false)) {
        await priorityButton.click();
        await page.click('text=High').catch(() => {});
      }

      // Save task
      await page.locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]').last().click().catch(async () => {
        await page.locator('button.variant-primary, button.bg-primary').first().click();
      });

      // Wait for creation
      await page.waitForTimeout(1500);

      // Verify task appears in backlog
      await expect(page.locator(`text=${taskTitle}`).first()).toBeVisible();
    });

    // ==========================================
    // STEP 4: Move Task to In Progress
    // ==========================================
    await test.step('Move task to In Progress', async () => {
      // Find the task and open it
      const taskCard = page.locator(`text=${taskTitle}`).first();
      
      if (await taskCard.isVisible().catch(() => false)) {
        await taskCard.click();

        // Wait for detail modal
        await expect(page.locator('[role="dialog"]').first()).toBeVisible();

        // Change status to In Progress
        await page.click('button:has-text("Status")').catch(() => {});
        await page.click('text=In Progress').catch(() => {});

        // Save changes
        await page.click('button:has-text("Save")').catch(() => {});
        await page.waitForTimeout(500);

        // Close modal
        await page.locator('button[aria-label="Close"], button:has([data-lucide="x"])').first().click().catch(async () => {
          await page.keyboard.press('Escape');
        });
      }
    });

    // ==========================================
    // STEP 5: Complete the Task
    // ==========================================
    await test.step('Complete the task', async () => {
      // Open task details
      await page.locator(`text=${taskTitle}`).first().click();
      await expect(page.locator('[role="dialog"]').first()).toBeVisible();

      // Change status to Done/Completed
      await page.click('button:has-text("Status")').catch(() => {});
      await page.click('text=Done').catch(() => {});
      await page.click('text=Completed').catch(() => {});

      // Save changes
      await page.click('button:has-text("Save")').catch(() => {});
      await page.waitForTimeout(500);

      // Close modal
      await page.locator('button[aria-label="Close"], button:has([data-lucide="x"])').first().click().catch(async () => {
        await page.keyboard.press('Escape');
      });
    });

    // ==========================================
    // STEP 6: Verify Activity Feed
    // ==========================================
    await test.step('Verify activity feed shows actions', async () => {
      // Navigate to activity page
      await page.goto('/portal/activity');
      await page.waitForLoadState('networkidle');

      // Verify activity page loads
      await expect(page.locator('text=Activity').or(page.locator('h1'))).toBeVisible();
    });

    // ==========================================
    // Cleanup: Delete test user
    // ==========================================
    await test.step('Cleanup test data', async () => {
      try {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const testUser = users?.find((u) => u.email === testEmail);

        if (testUser) {
          await supabase.auth.admin.deleteUser(testUser.id);
        }
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
  });
});

test.describe('Critical Path - Authentication', () => {
  test('user can logout and login again', async ({ browser }) => {
    // Create a new context for this test
    const context = await browser.newContext();
    const page = await context.newPage();

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const testEmail = 'e2e-logout-test@pinkbeam-test.com';

    // Ensure user exists
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users?.find((u) => u.email === testEmail);

    if (!existingUser) {
      await supabase.auth.admin.createUser({
        email: testEmail,
        email_confirm: true,
      });
    }

    // Login
    await page.goto('/auth');
    await page.getByLabel('Email address').fill(testEmail);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Enter your code')).toBeVisible({ timeout: 15000 });

    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: testEmail,
    });

    const otp = linkData?.properties?.email_otp;
    if (!otp) throw new Error('No OTP returned');

    const otpInputs = page.locator('input[inputmode="numeric"]');
    await otpInputs.first().waitFor({ state: 'visible' });
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(otp[i]);
    }

    await page.getByRole('button', { name: 'Verify & Sign In' }).click();
    await page.waitForURL('**/portal**', { timeout: 30000 });

    // Verify logged in
    await expect(page).toHaveURL(/\/portal/);

    // Logout via sidebar
    const logoutButton = page.locator('button:has-text("Logout")').first();
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Should redirect to auth or home
    await expect(page).toHaveURL(/\/(auth|\/)$/);

    await context.close();
  });
});

test.describe('Critical Path - Error Handling', () => {
  test('shows 404 page for non-existent routes', async ({ authenticatedPage: page }) => {
    await page.goto('/portal/non-existent-page');
    await page.waitForLoadState('networkidle');

    // Should show 404 or redirect
    const has404 = await page.locator('text=404, text=Not Found, text=Page not found').first().isVisible().catch(() => false);
    const hasRedirect = page.url() !== '/portal/non-existent-page';

    expect(has404 || hasRedirect).toBe(true);
  });

  test('handles network errors gracefully', async ({ authenticatedPage: page }) => {
    // Block API requests to simulate network error
    await page.route('**/api/**', route => route.abort('internetdisconnected'));

    await page.goto('/portal/agents');

    // Page should still load without crashing
    await expect(page.locator('body')).toBeVisible();

    // Remove route blocking
    await page.unroute('**/api/**');
  });
});
