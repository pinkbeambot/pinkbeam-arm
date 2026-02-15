import { test as base, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Test user credentials
export const TEST_USER_EMAIL = `e2e-test-${Date.now()}@example.com`;
export const TEST_TENANT_NAME = `E2E Test Tenant ${Date.now()}`;

/**
 * Extended test fixture with authentication helpers
 */
export interface TestFixtures {
  /** Pre-authenticated page for tests requiring login */
  authenticatedPage: Page;
  /** Helper to login with magic link simulation */
  login: (page: Page, email?: string) => Promise<void>;
  /** Helper to cleanup test data */
  cleanup: () => Promise<void>;
}

/**
 * Login helper - simulates magic link authentication for E2E tests
 * Uses Supabase service role to create session directly
 */
export async function login(page: Page, _email: string = TEST_USER_EMAIL): Promise<void> {
  // For E2E tests, we rely on the DEV_AUTH_BYPASS mode
  // This is set in the environment and allows us to skip real auth
  await page.goto('/portal');
  await page.waitForLoadState('networkidle');
}

/**
 * Login using dev auth bypass (requires DEV_AUTH_BYPASS=true)
 * This is the preferred method for E2E tests as it bypasses actual auth
 */
export async function loginWithBypass(page: Page): Promise<void> {
  // The middleware will bypass auth when DEV_AUTH_BYPASS=true
  // We just need to visit the portal directly
  await page.goto('/portal');
  
  // Wait for the dashboard to load
  await page.waitForLoadState('networkidle');
}

/**
 * Cleanup helper - removes test data created during tests
 */
export async function cleanupTestData(): Promise<void> {
  if (!supabaseServiceKey) {
    console.warn('No service role key available for cleanup');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Delete test users
    const { data: users } = await supabase.auth.admin.listUsers();
    const testUsers = users?.users.filter((u: { email?: string }) => u.email?.startsWith('e2e-test-')) || [];
    
    for (const user of testUsers) {
      await supabase.auth.admin.deleteUser(user.id);
    }

    // Clean up test tenants and related data
    // Note: CASCADE deletes should handle related records
    const { error: tenantError } = await supabase
      .from('tenants')
      .delete()
      .ilike('name', 'E2E Test Tenant%');

    if (tenantError) {
      console.error('Error cleaning up tenants:', tenantError);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

/**
 * Create test fixtures with extended functionality
 */
export const test = base.extend<TestFixtures>({
  // Auto-login fixture - provides an authenticated page
  authenticatedPage: async ({ page }, use) => {
    await loginWithBypass(page);
    await use(page); // eslint-disable-line react-hooks/rules-of-hooks
  },

  // Login helper
  login: async ({ }, use) => {
    await use(login); // eslint-disable-line react-hooks/rules-of-hooks
  },

  // Cleanup helper
  cleanup: async ({ }, use) => {
    await use(cleanupTestData); // eslint-disable-line react-hooks/rules-of-hooks
  },
});

// Export expect for assertions
export { expect };
