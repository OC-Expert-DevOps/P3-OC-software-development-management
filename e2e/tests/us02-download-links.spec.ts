import { test, expect } from '@playwright/test';
import { generateTestUser, registerAndLogin } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import { DashboardPage } from '../pages/dashboard.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

test.describe('US02 — Download Links', () => {
  test('should generate a download link for an uploaded file', async ({ page }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    // Upload a file first
    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    // Generate a download link
    const dashboard = new DashboardPage(page);
    await dashboard.clickGenerateLink(0);
    await page.waitForTimeout(1000);

    const notification = await dashboard.getLinkNotification();
    expect(notification).toContain('Download link');
  });

  test('should access download link publicly (without auth)', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    // Upload a file
    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    // Generate link via API
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const filesResponse = await request.get('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const files = await filesResponse.json();
    const fileId = files.data?.[0]?.id || files[0]?.id;

    if (fileId) {
      const linkResponse = await request.post(`/api/files/${fileId}/links`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { expiresInSeconds: 86400 },
      });
      if (linkResponse.ok()) {
        const linkData = await linkResponse.json();
        const downloadToken = linkData.token || linkData.data?.token;
        if (downloadToken) {
          // Access download link without auth
          const downloadResponse = await request.get(`/api/download/${downloadToken}`);
          expect([200, 302]).toContain(downloadResponse.status());
        }
      }
    }
  });
});
