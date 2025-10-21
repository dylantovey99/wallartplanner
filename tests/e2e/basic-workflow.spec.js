import { test, expect } from '@playwright/test';

test.describe('Wall Art Planner - Basic Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should load the main page', async ({ page }) => {
        await expect(page).toHaveTitle(/Wall Art Planner/);
        await expect(page.locator('.wall-canvas')).toBeVisible();
    });

    test('should have wall dimension inputs', async ({ page }) => {
        await expect(page.locator('#wallWidth')).toBeVisible();
        await expect(page.locator('#wallHeight')).toBeVisible();
    });

    test('should add a frame collection', async ({ page }) => {
        // Set frame dimensions
        await page.fill('#printWidth', '16');
        await page.fill('#printHeight', '20');
        await page.fill('#mattWidth', '5');
        await page.selectOption('#frameWidth', '20');
        await page.fill('#frameCount', '1');

        // Add collection
        await page.click('#addCollection');

        // Verify frame was added
        const frames = page.locator('.frame');
        await expect(frames).toHaveCount(1);
    });

    test('should allow dragging a frame', async ({ page }) => {
        // Add a frame first
        await page.fill('#printWidth', '16');
        await page.fill('#printHeight', '20');
        await page.click('#addCollection');

        const frame = page.locator('.frame').first();
        await expect(frame).toBeVisible();

        // Get initial position
        const initialBox = await frame.boundingBox();
        expect(initialBox).not.toBeNull();

        // Drag frame to new position
        await frame.hover();
        await page.mouse.down();
        await page.mouse.move(initialBox.x + 100, initialBox.y + 100);
        await page.mouse.up();

        // Get final position
        const finalBox = await frame.boundingBox();

        // Verify position changed
        expect(finalBox.x).not.toBe(initialBox.x);
        expect(finalBox.y).not.toBe(initialBox.y);
    });

    test('should delete a frame', async ({ page }) => {
        // Add a frame
        await page.fill('#printWidth', '16');
        await page.fill('#printHeight', '20');
        await page.click('#addCollection');

        // Verify frame exists
        await expect(page.locator('.frame')).toHaveCount(1);

        // Delete it
        await page.click('.delete-btn');

        // Verify frame is removed
        await expect(page.locator('.frame')).toHaveCount(0);
    });

    test('should display frame information', async ({ page }) => {
        // Add a frame
        await page.fill('#printWidth', '16');
        await page.fill('#printHeight', '20');
        await page.click('#addCollection');

        // Click info button
        await page.click('.frame-info-btn');

        // Verify modal appears
        const modal = page.locator('#frameInfoModal');
        await expect(modal).toBeVisible();

        // Verify information is displayed
        await expect(modal.locator('.print-size')).toContainText('16');
        await expect(modal.locator('.print-size')).toContainText('20');
    });

    test('should calculate prices', async ({ page }) => {
        // Add a frame
        await page.fill('#printWidth', '16');
        await page.fill('#printHeight', '20');
        await page.click('#addCollection');

        // Open price section and calculate
        const priceSection = page.locator('section').filter({ hasText: 'Price this Collection' });
        await priceSection.locator('h2').click(); // Expand section

        await page.click('#calculatePrice');

        // Verify modal appears with prices
        const modal = page.locator('#priceSummaryModal');
        await expect(modal).toBeVisible();

        // Verify price elements exist
        await expect(modal.locator('.grand-total')).toBeVisible();
        await expect(modal.locator('.grand-total')).toContainText('$');
    });

    test('should save and restore state', async ({ page }) => {
        // Add a frame
        await page.fill('#printWidth', '16');
        await page.fill('#printHeight', '20');
        await page.click('#addCollection');

        // Wait for frame to be added
        await expect(page.locator('.frame')).toHaveCount(1);

        // Reload page
        await page.reload();

        // Verify frame is still there
        await expect(page.locator('.frame')).toHaveCount(1);
    });
});

test.describe('Wall Art Planner - Accessibility', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should have proper ARIA labels', async ({ page }) => {
        // Add a frame
        await page.fill('#printWidth', '16');
        await page.fill('#printHeight', '20');
        await page.click('#addCollection');

        const frame = page.locator('.frame').first();

        // Check for ARIA attributes
        await expect(frame).toHaveAttribute('tabindex', '0');
        await expect(frame).toHaveAttribute('role', 'button');
    });

    test('should support keyboard navigation', async ({ page }) => {
        // Add a frame
        await page.fill('#printWidth', '16');
        await page.fill('#printHeight', '20');
        await page.click('#addCollection');

        // Focus on frame
        await page.keyboard.press('Tab');
        const frame = page.locator('.frame').first();

        // Check if frame has focus
        await expect(frame).toBeFocused();

        // Try keyboard navigation
        const initialBox = await frame.boundingBox();

        // Press arrow key
        await page.keyboard.press('ArrowRight');

        // Small delay for position update
        await page.waitForTimeout(100);

        const finalBox = await frame.boundingBox();

        // Position should have changed
        expect(finalBox.x).toBeGreaterThan(initialBox.x);
    });
});
