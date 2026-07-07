import { Page } from '@playwright/test';

export class RegisterPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/register');
  }

  async fillEmail(email: string) {
    await this.page.fill('input[type="email"]', email);
  }

  /** Fills both the password and confirm-password fields with the same value. */
  async fillPassword(password: string) {
    const passwordInputs = this.page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(password);
    await passwordInputs.nth(1).fill(password);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async register(email: string, password: string) {
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async getErrorMessage() {
    const el = this.page.locator('[data-testid="error-message"]');
    return el.textContent();
  }
}
