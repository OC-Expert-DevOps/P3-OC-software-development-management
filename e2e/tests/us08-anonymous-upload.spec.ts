import { test, expect } from '@playwright/test';

test.describe('US08 — Anonymous Upload', () => {
  test('should allow anonymous file upload via API', async ({ request }) => {
    const response = await request.post('/api/files/anonymous', {
      multipart: {
        file: {
          name: 'anon-test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Anonymous upload test content'),
        },
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeTruthy();
    expect(body.userId).toBeNull();
    expect(body.originalName).toBe('anon-test.txt');
  });
});
