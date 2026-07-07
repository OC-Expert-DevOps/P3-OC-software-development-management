import { test, expect } from '@playwright/test';
import { generateTestUser, registerAndLogin } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

test.describe('US02 — Download Links', () => {
  test('should generate a download link for an uploaded file', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    // Upload a file first
    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    // Get JWT token and file list via API
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const filesRes = await request.get('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(filesRes.ok()).toBeTruthy();
    const filesList = await filesRes.json();
    expect(filesList.length).toBeGreaterThanOrEqual(1);
    const fileId = filesList[0].id;

    // Generate download link via API
    const linkRes = await request.post(`/api/files/${fileId}/links`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ttlSeconds: 86400 },
    });
    expect(linkRes.status()).toBe(201);
    const linkData = await linkRes.json();
    expect(linkData.token).toBeTruthy();
  });

  test('should access download link publicly (without auth)', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    // Upload a file
    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const filesResponse = await request.get('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const files = await filesResponse.json();
    const fileId = files[0]?.id;
    expect(fileId).toBeTruthy();

    const linkResponse = await request.post(`/api/files/${fileId}/links`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ttlSeconds: 86400 },
    });
    expect(linkResponse.ok()).toBeTruthy();
    const linkData = await linkResponse.json();
    const downloadToken = linkData.token;
    expect(downloadToken).toBeTruthy();

    // Access the download link without auth. The backend streams the file
    // directly (200) — it does not redirect to a presigned MinIO URL.
    const downloadResponse = await request.get(`/api/download/${downloadToken}`, {
      maxRedirects: 0,
    });
    expect(downloadResponse.status()).toBe(200);
  });
});
