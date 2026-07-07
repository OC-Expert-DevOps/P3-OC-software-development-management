import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { generateTestUser, registerAndLogin } from '../fixtures/auth.fixture';
import { UploadPage } from '../pages/upload.page';
import * as path from 'path';

const TEST_FILE = path.resolve(__dirname, '../fixtures/test-file.txt');

async function uploadFileAndGetId(page: Page, request: APIRequestContext, token: string | null) {
  const uploadPage = new UploadPage(page);
  await uploadPage.uploadAndSubmit(TEST_FILE);
  const filesResponse = await request.get('/api/files', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const files = await filesResponse.json();
  return files[0]?.id;
}

test.describe('US09 — File Tags', () => {
  test('should add tags to a file via API', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const fileId = await uploadFileAndGetId(page, request, token);
    expect(fileId).toBeTruthy();

    // The real route is PUT (replace-all), not PATCH.
    const tagResponse = await request.put(`/api/files/${fileId}/tags`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { tags: ['important', 'invoice', 'Q4'] },
    });
    expect(tagResponse.status()).toBe(200);
    const body = await tagResponse.json();
    // Tags are normalized to lowercase server-side.
    expect(body.tags).toEqual(expect.arrayContaining(['important', 'invoice', 'q4']));
  });

  test('should normalize tags to lowercase', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const fileId = await uploadFileAndGetId(page, request, token);
    expect(fileId).toBeTruthy();

    const tagResponse = await request.put(`/api/files/${fileId}/tags`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { tags: ['UPPERCASE', 'MiXeD'] },
    });
    expect(tagResponse.status()).toBe(200);
    const body = await tagResponse.json();
    expect(body.tags.length).toBe(2);
    body.tags.forEach((t: string) => expect(t).toBe(t.toLowerCase()));
  });

  test('should reject more than 10 tags', async ({ page, request }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const fileId = await uploadFileAndGetId(page, request, token);
    expect(fileId).toBeTruthy();

    const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    const tagResponse = await request.put(`/api/files/${fileId}/tags`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { tags: tooManyTags },
    });
    // class-validator's @ArrayMaxSize(10) is enforced by the global ValidationPipe,
    // which always responds 400 on NestJS.
    expect(tagResponse.status()).toBe(400);
  });
});
