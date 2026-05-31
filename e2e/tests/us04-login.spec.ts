import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/login.page';

test.describe('US04 — User Login / Logout', () => {
  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    const user = generateTestUser();
    await registerUser(page, user);
    await page.click('button:has-text("Logout")');

    const loginPage = new LoginPage(page);
    await loginPage.login(user.email, user.password);
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('should show error for wrong password', async ({ page }) => {
    const user = generateTestUser();
    await registerUser(page, user);
    await page.click('button:has-text("Logout")');

    const loginPage = new LoginPage(page);
    await loginPage.login(user.email, 'WrongPassword123!');
    await page.waitForTimeout(2000);
    const error = await loginPage.getErrorMessage();
    expect(error).toBeTruthy();
  });

  test('should logout and redirect to login page', async ({ page }) => {
    const user = generateTestUser();
    await registerUser(page, user);
    expect(page.url()).toContain('/dashboard');

    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});
