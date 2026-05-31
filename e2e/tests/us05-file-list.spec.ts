import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import { DashboardPage } from '../pages/dashboard.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

test.describe('US05 — File List (paginated)', () => {
  test('should display empty state when no files', async ({ page }) => {
    const user = generateTestUser();
    await registerUser(page, user);
    const dashboard = new DashboardPage(page);
    const msg = await dashboard.getEmptyMessage();
    expect(msg).toContain('No files');
  });

  test('should display uploaded files in list', async ({ page }) => {
    const user = generateTestUser();
    await registerUser(page, user);

    // Upload a file
    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    const dashboard = new DashboardPage(page);
    const count = await dashboard.getFileCount();
    expect(count).toBe(1);
  });

  test('should show file metadata (name, type, size, date)', async ({ page }) => {
    const user = generateTestUser();
    await registerUser(page, user);

    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    const dashboard = new DashboardPage(page);
    const headers = page.locator('thead th');
    const headerTexts = await headers.allTextContents();
    expect(headerTexts).toEqual(expect.arrayContaining(['Name', 'Type', 'Size', 'Uploaded']));
  });
});
