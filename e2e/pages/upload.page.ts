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
    // The dashboard navigation only proves the POST resolved on the client —
    // give the API a brief moment before callers immediately re-query
    // GET /files (observed as an intermittent empty list otherwise, most
    // visible on the last test of a long sequential run).
    await this.page.waitForTimeout(300);
  }

  async getErrorMessage() {
    const el = this.page.locator('[data-testid="error-message"]');
    return el.textContent();
  }
}
