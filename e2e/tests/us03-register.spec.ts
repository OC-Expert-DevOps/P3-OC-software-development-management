import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, registerAndLogin } from '../fixtures/auth.fixture';
import { RegisterPage } from '../pages/register.page';

test.describe('US03 — User Registration', () => {
  test('should register a new user and redirect to login', async ({ page }) => {
    const user = generateTestUser();
    const registerPage = new RegisterPage(page);
    await registerPage.register(user.name, user.email, user.password);
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
    await registerPage.register(user.name, user.email, user.password);
    await page.waitForTimeout(2000);
    const error = await registerPage.getErrorMessage();
    expect(error).toBeTruthy();
  });

  test('should prevent registration with short password (HTML5 validation)', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillName('Test');
    await registerPage.fillEmail('short@test.com');
    await registerPage.fillPassword('123'); // Too short (minLength=8)
    await registerPage.submit();
    // Should stay on register page (HTML5 validation prevents submit)
    expect(page.url()).toContain('/register');
  });
});
