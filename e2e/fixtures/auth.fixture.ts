import { test as base, expect, Page } from '@playwright/test';

/** Generate a unique test user for each test run. */
function generateTestUser() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    name: `TestUser-${id}`,
    email: `test-${id}@datashare.local`,
    password: 'TestPass123!',
  };
}

/** Register a new user via the UI — redirects to /login after success. */
async function registerUser(page: Page, user: { name: string; email: string; password: string }) {
  await page.goto('/register');
  await page.fill('input[type="text"]', user.name);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  // App redirects to /login after register (not /dashboard)
  await page.waitForURL('**/login', { timeout: 10000 });
}

/** Login an existing user via the UI — redirects to /dashboard. */
async function loginUser(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

/** Register then login — ends on /dashboard. */
async function registerAndLogin(page: Page, user?: { name: string; email: string; password: string }) {
  const u = user || generateTestUser();
  await registerUser(page, u);
  await loginUser(page, u);
  return u;
}

export { generateTestUser, registerUser, loginUser, registerAndLogin };

// Extended test fixture with authenticated page
type AuthFixtures = {
  authenticatedPage: Page;
  testUser: { name: string; email: string; password: string };
};

export const test = base.extend<AuthFixtures>({
  testUser: async ({}, use) => {
    const user = generateTestUser();
    await use(user);
  },
  authenticatedPage: async ({ page, testUser }, use) => {
    await registerAndLogin(page, testUser);
    await use(page);
  },
});

export { expect };
