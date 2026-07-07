import { test, expect } from '@playwright/test';
import { generateTestUser, registerAndLogin } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

test.describe('US07 — Password Protection', () => {
  test('should set a password on a file via API', async ({ page, request }) => {
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

    // The real route is PUT, not PATCH.
    const pwResponse = await request.put(`/api/files/${fileId}/password`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { password: 'SecurePass123!' },
    });
    expect(pwResponse.status()).toBe(200);
    const body = await pwResponse.json();
    expect(body.message).toBeTruthy();
  });

  test('should remove password from a file via API', async ({ page, request }) => {
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

    // Set a password first so there is something to remove.
    await request.put(`/api/files/${fileId}/password`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { password: 'SecurePass123!' },
    });

    // Removal is a dedicated DELETE endpoint, not "PATCH with an empty password".
    const removeResponse = await request.delete(`/api/files/${fileId}/password`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(removeResponse.status()).toBe(204);

    // Confirm it's actually gone: the file's hasPassword flag should now be false.
    const fileResponse = await request.get(`/api/files/${fileId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const file = await fileResponse.json();
    expect(file.hasPassword).toBe(false);
  });
});
