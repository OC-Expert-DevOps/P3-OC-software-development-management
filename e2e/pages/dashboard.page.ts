import { Page } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  async getFileRows() {
    return this.page.locator('tbody tr').all();
  }

  async getFileCount() {
    const rows = await this.getFileRows();
    return rows.length;
  }

  async getFileName(index: number) {
    return this.page.locator(`tbody tr:nth-child(${index + 1}) td:first-child`).textContent();
  }

  async clickGenerateLink(index: number) {
    const rows = await this.getFileRows();
    await rows[index].locator('button:has-text("Link")').click();
  }

  async clickDelete(index: number) {
    const rows = await this.getFileRows();
    await rows[index].locator('button:has-text("Delete")').click();
  }

  async getLinkNotification() {
    return this.page.locator('div[style*="background: rgb(232, 245, 233)"]').textContent();
  }

  async getEmptyMessage() {
    return this.page.locator('p[style*="color: rgb(136, 136, 136)"]').textContent();
  }
}
