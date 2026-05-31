import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import { DashboardPage } from '../pages/dashboard.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

test.describe('US01 — File Upload (authenticated)', () => {
  test('should upload a file and see it in dashboard', async ({ page }) => {
    const user = generateTestUser();
    await registerUser(page, user);

    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    const dashboard = new DashboardPage(page);
    const count = await dashboard.getFileCount();
    expect(count).toBeGreaterThanOrEqual(1);

    const fileName = await dashboard.getFileName(0);
    expect(fileName).toContain('test-file.txt');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/upload');
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});
