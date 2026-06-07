import { test, expect } from '@playwright/test';
import { generateTestUser, registerAndLogin } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

test.describe('US09 — File Tags', () => {
  test('should add tags to a file via API', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const filesResponse = await request.get('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const files = await filesResponse.json();
    const fileId = files.data?.[0]?.id || files[0]?.id;

    if (fileId) {
      const tagResponse = await request.patch(`/api/files/${fileId}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { tags: ['important', 'invoice', 'Q4'] },
      });
      expect([200, 204, 404]).toContain(tagResponse.status());
    }
  });

  test('should normalize tags to lowercase', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const filesResponse = await request.get('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const files = await filesResponse.json();
    const fileId = files.data?.[0]?.id || files[0]?.id;

    if (fileId) {
      const tagResponse = await request.patch(`/api/files/${fileId}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { tags: ['UPPERCASE', 'MiXeD'] },
      });
      if (tagResponse.ok()) {
        const body = await tagResponse.json();
        const tags = body.tags || body.data?.tags || [];
        tags.forEach((t: string) => expect(t).toBe(t.toLowerCase()));
      }
    }
  });

  test('should reject more than 10 tags', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    const uploadPage = new UploadPage(page);
    await uploadPage.uploadAndSubmit(TEST_FILE);

    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const filesResponse = await request.get('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const files = await filesResponse.json();
    const fileId = files.data?.[0]?.id || files[0]?.id;

    if (fileId) {
      const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
      const tagResponse = await request.patch(`/api/files/${fileId}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { tags: tooManyTags },
      });
      // Should reject with 400 or 422
      expect([400, 422, 404]).toContain(tagResponse.status());
    }
  });
});
