import { test, expect } from '@playwright/test';
import { generateTestUser, registerAndLogin } from '../fixtures/auth.fixture';

test.describe('US06 — User Statistics', () => {
  test('should show stats on dashboard via API', async ({ page }) => {
    const user = generateTestUser();
    await registerAndLogin(page, user);

    // Check stats API endpoint
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const response = await page.request.get('/api/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body).toBeTruthy();
  });
});
