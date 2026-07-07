import { test, expect } from '@playwright/test';
import { generateTestUser, registerAndLogin } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import { DashboardPage } from '../pages/dashboard.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

test.describe('US05 — File List', () => {
  test('should display empty state when no files', async ({ page }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);
    const dashboard = new DashboardPage(page);
    const msg = await dashboard.getEmptyMessage();
    expect(msg).toContain('Aucun fichier');
  });

  test('should display uploaded files in list', async ({ page }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    // Upload a file
    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    const dashboard = new DashboardPage(page);
    const count = await dashboard.getFileCount();
    expect(count).toBe(1);
  });

  test('should show file name and type badge in the list', async ({ page }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoaded();
    // The current list view only surfaces name + extension badge + expiry —
    // exact size and upload date aren't rendered per-row (unlike the old
    // table-based design this test used to check against).
    const fileName = await dashboard.getFileName(0);
    expect(fileName).toContain('test-file.txt');
    const badge = page.getByTestId('file-type-badge').first();
    await expect(badge).toHaveText('TXT');
  });
});
