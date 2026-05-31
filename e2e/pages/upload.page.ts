import { Page } from '@playwright/test';
import * as path from 'path';

export class UploadPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/upload');
  }

  async uploadFile(filePath: string) {
    await this.goto();
    const input = this.page.locator('input[type="file"]');
    await input.setInputFiles(filePath);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async uploadAndSubmit(filePath: string) {
    await this.uploadFile(filePath);
    await this.submit();
    await this.page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  async getErrorMessage() {
    const el = this.page.locator('div[style*="color: rgb(204, 0, 0)"]');
    return el.textContent();
  }

  async getSelectedFileName() {
    const el = this.page.locator('strong');
    return el.textContent();
  }
}
