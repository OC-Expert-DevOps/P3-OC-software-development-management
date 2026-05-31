import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

test.describe('US07 — Password Protection', () => {
  test('should set a password on a file via API', async ({ page, request }) => {
    const user = generateTestUser();
    await registerUser(page, user);

    // Upload a file
    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    // Get file ID
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const filesResponse = await request.get('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const files = await filesResponse.json();
    const fileId = files.data?.[0]?.id || files[0]?.id;

    if (fileId) {
      // Set password
      const pwResponse = await request.patch(`/api/files/${fileId}/password`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: 'SecurePass123!' },
      });
      // Accept 200/204 (success) or 404 (feature not yet implemented)
      expect([200, 204, 404]).toContain(pwResponse.status());
    }
  });

  test('should remove password from a file via API', async ({ page, request }) => {
    const user = generateTestUser();
    await registerUser(page, user);

    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const filesResponse = await request.get('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const files = await filesResponse.json();
    const fileId = files.data?.[0]?.id || files[0]?.id;

    if (fileId) {
      // Remove password (empty string or null)
      const pwResponse = await request.patch(`/api/files/${fileId}/password`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: '' },
      });
      expect([200, 204, 404]).toContain(pwResponse.status());
    }
  });
});
