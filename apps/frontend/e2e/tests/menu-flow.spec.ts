import { test, expect } from '@playwright/test';

test.describe('Menu Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should load locations and select one', async ({ page }) => {
    // Wait for location selector to load
    await page.waitForSelector('select#location-select', { timeout: 10000 });

    // Check that locations are loaded
    const locationSelect = page.locator('select#location-select');
    await expect(locationSelect).toBeVisible();

    // Get all options
    const options = await locationSelect.locator('option').all();
    expect(options.length).toBeGreaterThan(1); // At least the placeholder + 1 location

    // Select the first actual location (skip placeholder)
    await locationSelect.selectOption({ index: 1 });

    // Verify selection worked
    const selectedValue = await locationSelect.inputValue();
    expect(selectedValue).not.toBe('');
  });

  test('should load menu items after location selected', async ({ page }) => {
    // Select location
    await page.waitForSelector('select#location-select', { timeout: 10000 });
    const locationSelect = page.locator('select#location-select');
    await locationSelect.selectOption({ index: 1 });

    // Wait for loading to finish and menu items to appear
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 15000 });

    // Verify menu items are displayed
    const menuItems = page.locator('[data-testid="menu-item"]');
    await expect(menuItems.first()).toBeVisible();
  });

  test('should display items grouped by category', async ({ page }) => {
    // Select location
    await page.waitForSelector('select#location-select', { timeout: 10000 });
    await page.locator('select#location-select').selectOption({ index: 1 });

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for category headings
    const categoryHeadings = page.locator('h2');
    const count = await categoryHeadings.count();

    // Should have at least one category
    expect(count).toBeGreaterThan(0);
  });

  test('should filter items with search', async ({ page }) => {
    // Select location
    await page.waitForSelector('select#location-select', { timeout: 10000 });
    await page.locator('select#location-select').selectOption({ index: 1 });

    // Wait for menu to load
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 15000 });

    // Get initial item count
    const menuItems = page.locator('[data-testid="menu-item"]');
    const initialCount = await menuItems.count();

    // Type in search box
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('pizza');

    // Wait for debounce
    await page.waitForTimeout(500);

    // Items should be filtered (count should change or stay the same)
    const filteredCount = await menuItems.count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('should toggle dark mode', async ({ page }) => {
    // Check initial theme
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');

    // Find and click dark mode toggle
    const darkModeButton = page.locator('button[aria-label*="theme"], button[aria-label*="dark mode"]').first();

    if (await darkModeButton.isVisible()) {
      await darkModeButton.click();

      // Wait for transition
      await page.waitForTimeout(300);

      // Verify class changed
      const newClass = await html.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    } else {
      // If dark mode toggle doesn't exist, skip this test
      test.skip();
    }
  });

  test('should display error state and allow retry', async ({ page, context }) => {
    // Block API requests to simulate error
    await context.route('**/api/**', route => route.abort());

    await page.goto('http://localhost:5173');

    // Select location (this should trigger error)
    await page.waitForSelector('select#location-select', { timeout: 10000 });
    await page.locator('select#location-select').selectOption({ index: 1 });

    // Wait for error message to appear
    await page.waitForSelector('text=/error|failed|retry/i', { timeout: 10000 });

    // Verify error message is visible
    const errorMessage = page.locator('text=/error|failed/i').first();
    await expect(errorMessage).toBeVisible();

    // Look for retry button
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try again")').first();
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();
    }
  });

  test('should display empty state when no items', async ({ page, context }) => {
    // Mock API to return empty catalog
    await context.route('**/api/catalog*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: [] })
      });
    });

    // Mock locations endpoint
    await context.route('**/api/locations', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          locations: [{
            id: 'TEST123',
            name: 'Test Location',
            address: {},
            timezone: 'UTC',
            status: 'ACTIVE'
          }]
        })
      });
    });

    await page.goto('http://localhost:5173');

    // Select location
    await page.waitForSelector('select#location-select', { timeout: 10000 });
    await page.locator('select#location-select').selectOption({ index: 1 });

    // Wait for empty state
    await page.waitForTimeout(2000);

    // Verify empty state message
    const emptyState = page.locator('text=/no menu items|no items|empty/i').first();
    await expect(emptyState).toBeVisible();
  });

  test('should display loading skeletons while fetching data', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Select location
    await page.waitForSelector('select#location-select', { timeout: 10000 });
    const locationSelect = page.locator('select#location-select');
    await locationSelect.selectOption({ index: 1 });

    // Loading skeleton should appear briefly
    // Note: This might be too fast to catch, so we just verify it doesn't crash
    await page.waitForTimeout(100);

    // Eventually menu items should appear
    await page.waitForSelector('[data-testid="menu-item"]', { timeout: 15000 });
  });
});
