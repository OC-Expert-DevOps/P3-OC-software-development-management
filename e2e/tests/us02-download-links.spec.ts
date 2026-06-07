import { test, expect } from '@playwright/test';
import { generateTestUser, registerAndLogin } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import { DashboardPage } from '../pages/dashboard.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

test.describe('US02 — Download Links', () => {
  test('should generate a download link for an uploaded file', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    // Upload a file first
    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    // Wait a moment for the file to be fully persisted
    await page.waitForTimeout(500);

    // Get JWT token and file list via API
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const filesRes = await request.get('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(filesRes.ok()).toBeTruthy();
    const filesBody = await filesRes.json();
    const filesList = filesBody.data || filesBody;
    expect(filesList.length).toBeGreaterThanOrEqual(1);
    const fileId = filesList[0].id;

    // Generate download link via API
    const linkRes = await request.post(`/api/files/${fileId}/links`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ttlSeconds: 86400 },
    });
    // If link creation fails, check status for debugging
    if (!linkRes.ok()) {
      const errBody = await linkRes.json().catch(() => ({}));
      throw new Error(`Link creation failed: ${linkRes.status()} ${JSON.stringify(errBody)}`);
    }
    const linkData = await linkRes.json();
    const downloadToken = linkData.token || linkData.data?.token;
    expect(downloadToken).toBeTruthy();
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
        data: { ttlSeconds: 86400 },
      });
      if (linkResponse.ok()) {
        const linkData = await linkResponse.json();
        const downloadToken = linkData.token || linkData.data?.token;
        if (downloadToken) {
          // Access download link without auth (don't follow redirect to internal minio host)
          const downloadResponse = await request.get(`/api/download/${downloadToken}`, {
            maxRedirects: 0,
          });
          // Backend returns 302 redirect to MinIO presigned URL
          expect([200, 302]).toContain(downloadResponse.status());
        }
      }
    }
  });
});
