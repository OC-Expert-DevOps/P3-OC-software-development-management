import { Page } from '@playwright/test';

export class RegisterPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/register');
  }

  async fillName(name: string) {
    await this.page.fill('input[type="text"]', name);
  }

  async fillEmail(email: string) {
    await this.page.fill('input[type="email"]', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('input[type="password"]', password);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async register(name: string, email: string, password: string) {
    await this.goto();
    await this.fillName(name);
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async getErrorMessage() {
    const el = this.page.locator('div[style*="color: rgb(204, 0, 0)"]');
    return el.textContent();
  }
}
