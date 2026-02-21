import { test as base, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'fs';

// Re-export constants from auth setup
export { TEST_EMAIL, STORAGE_STATE } from './auth.setup';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface TestFixtures {
  /** Pre-authenticated page loaded from storageState */
  authenticatedPage: Page;
  /** Helper to cleanup transient test data */
  cleanup: () => Promise<void>;
}

/**
 * Cleanup transient test data created during E2E tests.
 * Does NOT remove the persistent e2e-test user or its tenant.
 */
export async function cleanupTestData(): Promise<void> {
  if (!supabaseServiceKey) {
    console.warn('No service role key available for cleanup');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const transientUsers = users?.filter(
      (u) =>
        u.email?.startsWith('test-e2e-') ||
        (u.email?.startsWith('e2e-test-') && u.email !== 'e2e-test@pinkbeam-test.com')
    ) || [];

    for (const user of transientUsers) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

/**
 * Extended test fixtures.
 *
 * `authenticatedPage` creates a new browser context pre-loaded with the
 * session cookies saved by the auth.setup project, giving each test an
 * isolated but authenticated page.
 */
export const test = base.extend<TestFixtures>({
  // eslint-disable-next-line react-hooks/rules-of-hooks
  authenticatedPage: async ({ browser }, use) => {
    const storageStatePath = '.playwright/.auth/user.json';
    if (!existsSync(storageStatePath)) {
      throw new Error(
        `Auth setup incomplete: ${storageStatePath} not found. ` +
        `Run the setup project first: npx playwright test --project=setup`
      );
    }

    const context = await browser.newContext({
      storageState: storageStatePath,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // eslint-disable-next-line react-hooks/rules-of-hooks
  cleanup: async ({}, use) => {
    await use(cleanupTestData);
  },
});

export { expect };
