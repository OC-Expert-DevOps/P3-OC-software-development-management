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

/** Register a new user via the UI. */
async function registerUser(page: Page, user: { name: string; email: string; password: string }) {
  await page.goto('/register');
  await page.fill('input[type="text"]', user.name);
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

/** Login an existing user via the UI. */
async function loginUser(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

/** Register + login helper that returns the user object. */
async function registerAndLogin(page: Page) {
  const user = generateTestUser();
  await registerUser(page, user);
  return user;
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
    await registerUser(page, testUser);
    await use(page);
  },
});

export { expect };
