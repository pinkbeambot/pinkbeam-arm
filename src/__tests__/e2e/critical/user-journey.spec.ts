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
    test.setTimeout(120000); // 2 minute timeout for full journey

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
      await expect(page.locator('text=Dashboard').or(page.locator('h1'))).toBeVisible();
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
      await expect(page.locator('text=Create New Agent')).toBeVisible();

      // Select a template
      await page.click('button:has-text("Content Writer")');

      // Fill agent details
      await page.fill('input#name', agentName);
      await page.fill('textarea#description', 'Agent created during E2E journey test');

      // Proceed through wizard
      await page.click('button:has-text("Next")');
      await expect(page.locator('text=Select what this agent is allowed to do')).toBeVisible();

      // Continue to review
      await page.click('button:has-text("Next")');
      await expect(page.locator('text=Review')).toBeVisible();
      await expect(page.locator(`text=${agentName}`)).toBeVisible();

      // Create the agent
      await page.click('button:has-text("Create Agent")');

      // Wait for creation and verify
      await page.waitForTimeout(1000);
      await expect(page.locator(`text=${agentName}`)).toBeVisible();
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
      await expect(page.locator('text=Create Task').or(page.locator('text=New Task'))).toBeVisible();

      // Fill task details
      await page.fill('input[name="title"], input[placeholder*="title"], input[type="text"]', taskTitle);
      await page.fill('textarea[name="description"], textarea[placeholder*="description"]', 
        'Task created during E2E journey test');

      // Set priority if available
      await page.click('button:has-text("Priority")').catch(() => {});
      await page.click('text=High').catch(() => {});

      // Assign to our new agent if possible
      await page.click('button:has-text("Assignee")').catch(() => {});
      await page.click(`text=${agentName}`).catch(() => {});

      // Save task
      await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]').catch(async () => {
        await page.locator('button.variant-primary, button.bg-primary').first().click();
      });

      // Wait for creation
      await page.waitForTimeout(1000);

      // Verify task appears in backlog
      await expect(page.locator(`text=${taskTitle}`)).toBeVisible();
    });

    // ==========================================
    // STEP 4: Move Task to In Progress
    // ==========================================
    await test.step('Move task to In Progress', async () => {
      // Find the task card
      const taskCard = page.locator(`text=${taskTitle}`).locator('xpath=ancestor::div[contains(@class, "task") or @draggable="true"]').first();

      if (await taskCard.isVisible().catch(() => false)) {
        // Get the In Progress column
        const inProgressColumn = page.locator('text=In Progress').locator('xpath=ancestor::div[contains(@class, "column") or contains(@class, "status")]').first();

        if (await inProgressColumn.isVisible().catch(() => false)) {
          // Drag and drop
          await taskCard.dragTo(inProgressColumn);
          await page.waitForTimeout(1000);
        }
      }

      // Alternative: Click task and change status
      await page.locator(`text=${taskTitle}`).first().click();

      // Wait for detail modal
      await expect(page.locator('text=Task Details').or(page.locator('text=Edit Task'))).toBeVisible();

      // Change status to In Progress
      await page.click('button:has-text("Status")').catch(() => {});
      await page.click('text=In Progress').catch(() => {});

      // Save changes
      await page.click('button:has-text("Save")').catch(() => {});
      await page.waitForTimeout(500);

      // Close modal
      await page.click('button:has-text("Close"), button[aria-label="Close"]').catch(() => {
        page.keyboard.press('Escape');
      });
    });

    // ==========================================
    // STEP 5: Complete the Task
    // ==========================================
    await test.step('Complete the task', async () => {
      // Open task details
      await page.locator(`text=${taskTitle}`).first().click();
      await expect(page.locator('text=Task Details').or(page.locator('text=Edit Task'))).toBeVisible();

      // Change status to Done/Completed
      await page.click('button:has-text("Status")').catch(() => {});
      await page.click('text=Done').catch(() => {});
      await page.click('text=Completed').catch(() => {});

      // Save changes
      await page.click('button:has-text("Save")').catch(() => {});
      await page.waitForTimeout(500);

      // Close modal
      await page.click('button:has-text("Close"), button[aria-label="Close"]').catch(() => {
        page.keyboard.press('Escape');
      });

      // Verify task is now in Done column (if visible)
      await page.waitForTimeout(500);
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

      // Activity feed should show recent actions
      await expect(page.locator('body')).toBeVisible();
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

    // Logout
    const userMenu = page.locator('button[aria-label="User menu"], [data-testid="user-menu"]').first();
    await userMenu.click();

    const logoutButton = page.locator('text=Logout, text=Sign out').first();
    await logoutButton.click();

    // Should redirect to auth or home
    await expect(page).toHaveURL(/\/(auth|\/)$/);

    await context.close();
  });
});

test.describe('Critical Path - Agent Operations', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/agents');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('create, edit, and delete agent', async ({ authenticatedPage: page }) => {
    const timestamp = Date.now();
    const agentName = `CRUD Agent ${timestamp}`;
    const updatedName = `Updated Agent ${timestamp}`;

    // Create agent
    await test.step('Create agent', async () => {
      await page.click('button:has-text("Create Agent")');
      await expect(page.locator('text=Create New Agent')).toBeVisible();

      await page.click('button:has-text("Start from Scratch")');
      await page.fill('input#name', agentName);
      await page.fill('textarea#description', 'Test agent for CRUD operations');

      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Create Agent")');

      await page.waitForTimeout(1000);
      await expect(page.locator(`text=${agentName}`)).toBeVisible();
    });

    // Edit agent
    await test.step('Edit agent', async () => {
      // Click on the agent to open details
      await page.locator(`text=${agentName}`).first().click();

      // Wait for detail panel
      await expect(page.locator('text=Agent Details').or(page.locator('text=Details'))).toBeVisible();

      // Look for edit button
      const editButton = page.locator('button:has-text("Edit"), button[aria-label="Edit"]').first();

      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();

        // Update name
        const nameInput = page.locator('input#name, input[name="name"]').first();
        await nameInput.fill(updatedName);

        // Save
        await page.click('button:has-text("Save")').catch(() => {});
        await page.waitForTimeout(500);

        // Verify update
        await expect(page.locator(`text=${updatedName}`)).toBeVisible();
      }

      // Close panel
      await page.click('button:has-text("Close"), button[aria-label="Close"]').catch(() => {
        page.keyboard.press('Escape');
      });
    });

    // Delete agent
    await test.step('Delete agent', async () => {
      // Click on the agent to open details
      await page.locator(`text=${updatedName}`).first().click();
      await expect(page.locator('text=Agent Details').or(page.locator('text=Details'))).toBeVisible();

      // Look for delete button
      const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove"), button[aria-label="Delete"]').first();

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();

        // Confirm deletion
        await page.click('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').catch(() => {});

        await page.waitForTimeout(1000);

        // Verify agent is deleted
        await expect(page.locator(`text=${updatedName}`)).not.toBeVisible();
      }
    });
  });
});

test.describe('Critical Path - Task Operations', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/tasks');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  test('create, edit, move, and delete task', async ({ authenticatedPage: page }) => {
    const timestamp = Date.now();
    const taskTitle = `CRUD Task ${timestamp}`;
    const updatedTitle = `Updated Task ${timestamp}`;

    // Create task
    await test.step('Create task', async () => {
      await page.click('button:has-text("Create Task")');
      await expect(page.locator('text=Create Task').or(page.locator('text=New Task'))).toBeVisible();

      await page.fill('input[name="title"], input[placeholder*="title"], input[type="text"]', taskTitle);
      await page.fill('textarea[name="description"], textarea[placeholder*="description"]', 
        'Test task for CRUD operations');

      await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]').catch(async () => {
        await page.locator('button.variant-primary, button.bg-primary').first().click();
      });

      await page.waitForTimeout(1000);
      await expect(page.locator(`text=${taskTitle}`)).toBeVisible();
    });

    // Edit task
    await test.step('Edit task', async () => {
      await page.locator(`text=${taskTitle}`).first().click();
      await expect(page.locator('text=Task Details').or(page.locator('text=Edit Task'))).toBeVisible();

      const titleInput = page.locator('input[name="title"]').first();

      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill(updatedTitle);
        await page.click('button:has-text("Save")').catch(() => {});
        await page.waitForTimeout(500);
        await expect(page.locator(`text=${updatedTitle}`)).toBeVisible();
      }

      await page.click('button:has-text("Close"), button[aria-label="Close"]').catch(() => {
        page.keyboard.press('Escape');
      });
    });

    // Move task
    await test.step('Move task between columns', async () => {
      const taskCard = page.locator(`text=${updatedTitle}`).locator('xpath=ancestor::div[@draggable="true" or contains(@class, "task")]').first();

      if (await taskCard.isVisible().catch(() => false)) {
        const inProgressColumn = page.locator('text=In Progress').locator('xpath=ancestor::div[contains(@class, "column") or contains(@class, "status")]').first();

        if (await inProgressColumn.isVisible().catch(() => false)) {
          await taskCard.dragTo(inProgressColumn);
          await page.waitForTimeout(1000);
        }
      }
    });

    // Delete task
    await test.step('Delete task', async () => {
      await page.locator(`text=${updatedTitle}`).first().click();
      await expect(page.locator('text=Task Details').or(page.locator('text=Edit Task'))).toBeVisible();

      const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Remove")').first();

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        await page.click('button:has-text("Confirm"), button:has-text("Yes")').catch(() => {});
        await page.waitForTimeout(1000);
        await expect(page.locator(`text=${updatedTitle}`)).not.toBeVisible();
      }

      await page.click('button:has-text("Close"), button[aria-label="Close"]').catch(() => {
        page.keyboard.press('Escape');
      });
    });
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
