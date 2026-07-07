import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser } from '../fixtures/auth.fixture';
import { RegisterPage } from '../pages/register.page';

test.describe('US03 — User Registration', () => {
  test('should register a new user and redirect to login', async ({ page }) => {
    const user = generateTestUser();
    const registerPage = new RegisterPage(page);
    await registerPage.register(user.email, user.password);
    // App redirects to /login after register
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('should show error for duplicate email', async ({ page }) => {
    const user = generateTestUser();
    // Register first time → goes to /login
    await registerUser(page, user);
    // Try to register again with same email
    const registerPage = new RegisterPage(page);
    await registerPage.register(user.email, user.password);
    await page.waitForTimeout(2000);
    const error = await registerPage.getErrorMessage();
    expect(error).toBeTruthy();
  });

  test('should prevent registration with short password (server-side validation)', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillEmail('short@test.com');
    await registerPage.fillPassword('123'); // Too short (backend requires min 8 chars)
    await registerPage.submit();
    // No client-side length check today (only `required`) — the API call fails
    // and RegisterPage.tsx never navigates away, so we stay on /register either way.
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/register');
  });
});
