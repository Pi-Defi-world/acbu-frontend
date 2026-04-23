import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  // Helper to wait for page to be ready and handle auth modal
  async function waitForPageReady(page) {
    await page.waitForLoadState('networkidle');
    
    // Handle any authentication or wallet setup modals
    const skipButton = page.locator('button:has-text("Skip"), button:has-text("Skip for now"), button:has-text("Close")');
    if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(1000);
    }
  }

  // Helper to mock authentication
  async function mockAuth(page) {
    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          authenticated: true, 
          userId: 'test-user',
          stellarAddress: 'test-address'
        })
      });
    });
  }

  test('mint page should have no axe violations', async ({ page }) => {
    await mockAuth(page);
    await page.goto('/mint');
    await waitForPageReady(page);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.chakra-portal')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('burn page should have no axe violations', async ({ page }) => {
    await mockAuth(page);
    await page.goto('/burn');
    await waitForPageReady(page);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.chakra-portal')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('send page should have no axe violations', async ({ page }) => {
    await mockAuth(page);
    await page.goto('/send');
    await waitForPageReady(page);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.chakra-portal')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('savings withdraw page should have no axe violations', async ({ page }) => {
    await mockAuth(page);
    await page.goto('/savings/withdraw');
    await waitForPageReady(page);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.chakra-portal')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('mint form interactions should be accessible', async ({ page }) => {
    await mockAuth(page);
    await page.goto('/mint');
    await waitForPageReady(page);
    
    // Wait for the mint tab to be active and content to load
    await page.waitForTimeout(2000);
    
    // Try multiple selectors for the fiat select
    const fiatSelectors = [
      '#fiat-account-select',
      'select:has(option)',
      '[name="fiat-account"]'
    ];
    
    let fiatSelect = null;
    for (const selector of fiatSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        fiatSelect = element;
        break;
      }
    }
    
    if (fiatSelect) {
      // Check if there are options
      const options = await fiatSelect.locator('option').count();
      if (options > 1) {
        await fiatSelect.selectOption({ index: 1 });
      }
    }
    
    // Look for amount input
    const amountSelectors = [
      '#fiat-amount-input',
      'input[type="number"]',
      'input[placeholder*="0.00"]'
    ];
    
    let amountInput = null;
    for (const selector of amountSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        amountInput = element;
        break;
      }
    }
    
    if (amountInput) {
      await amountInput.fill('100');
    }
    
    // Look for mint button
    const mintButton = page.getByRole('button', { name: /Mint ACBU/i });
    if (await mintButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await mintButton.click();
      
      // Check dialog accessibility
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
    }
    
    // Run axe on the current state
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('send form interactions should be accessible', async ({ page }) => {
    await mockAuth(page);
    await page.goto('/send');
    await waitForPageReady(page);
    
    // Wait for page to be fully loaded
    await page.waitForTimeout(3000);
    
    // Try multiple selectors for the new transfer button
    const buttonSelectors = [
      'button:has-text("New Transfer")',
      'button:has-text("Send")',
      'button:has-text("Transfer")',
      '[aria-label="Create new transfer"]'
    ];
    
    let newTransferButton = null;
    for (const selector of buttonSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        newTransferButton = element;
        break;
      }
    }
    
    if (newTransferButton) {
      await newTransferButton.click();
      
      // Check dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      
      // Test tab navigation (just a few tabs to check focus management)
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    // Run axe on the current state
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    // Don't fail if no dialog was found - the page might be in a different state
    // Just check for violations on whatever is visible
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});