import { test, expect } from '@playwright/test';
import { generateTestUser, registerAndLogin } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

test.describe('US10 — Download History', () => {
  test('should record download events and expose history via API', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

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

    // Download the file — the backend streams it directly (200), it does not
    // redirect. This is what creates the DownloadHistory entry.
    const downloadResponse = await request.get(`/api/download/${downloadToken}`, {
      maxRedirects: 0,
    });
    expect(downloadResponse.status()).toBe(200);

    const historyResponse = await request.get(`/api/files/${fileId}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(historyResponse.status()).toBe(200);
    const events = await historyResponse.json();
    expect(Array.isArray(events)).toBeTruthy();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].tokenId).toBeTruthy();
  });
});
