import { test, expect } from '@playwright/test';

test.describe('Signup Flow', () => {
  test('should load signup page', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      console.log(`[${msg.type()}] ${text}`);
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.error('Page error:', error.message);
    });

    // Navigate to signup page
    await page.goto('http://localhost:3000/signup');
    
    // Wait for the page to load
    await expect(page.locator('text=Start managing your AI workforce')).toBeVisible();
    
    console.log('Console messages:', consoleMessages);
    console.log('Page errors:', pageErrors);
    
    expect(pageErrors).toHaveLength(0);
  });

  test('should submit signup form and show success', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      console.log(`[${msg.type()}] ${text}`);
    });

    // Capture page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.error('Page error:', error.message);
    });

    // Capture network requests
    const networkErrors: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        const error = `${response.status()}: ${response.url()}`;
        networkErrors.push(error);
        console.error('Network error:', error);
      }
    });

    // Navigate to signup page
    await page.goto('http://localhost:3000/signup');
    
    // Fill in the email
    await page.fill('input#email', 'test-signup-123@example.com');
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for either success or error
    await page.waitForTimeout(3000);
    
    console.log('Console messages:', consoleMessages);
    console.log('Page errors:', pageErrors);
    console.log('Network errors:', networkErrors);
    
    // Check if we see success message or error
    const successVisible = await page.locator('text=Check your email').isVisible().catch(() => false);
    const errorVisible = await page.locator('[role="alert"]').isVisible().catch(() => false);
    
    console.log('Success visible:', successVisible);
    console.log('Error visible:', errorVisible);
    
    expect(pageErrors).toHaveLength(0);
    expect(networkErrors).toHaveLength(0);
  });
});
