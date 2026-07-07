import { Page } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  /** Wait for loading to finish (the "Chargement…" placeholder disappears). */
  async waitForLoaded() {
    await this.page.getByTestId('loading').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Already gone before we could attach the wait — that's fine.
    });
  }

  async getFileRows() {
    await this.waitForLoaded();
    return this.page.getByTestId('file-row').all();
  }

  async getFileCount() {
    const rows = await this.getFileRows();
    return rows.length;
  }

  async getFileName(index: number) {
    const rows = await this.getFileRows();
    if (!rows[index]) throw new Error(`No file row at index ${index}`);
    return rows[index].getByTestId('file-name').textContent();
  }

  async clickGenerateLink(index: number) {
    const rows = await this.getFileRows();
    if (!rows[index]) throw new Error(`No file row at index ${index}`);
    await rows[index].getByTestId('generate-link-button').click();
  }

  async clickDelete(index: number) {
    const rows = await this.getFileRows();
    if (!rows[index]) throw new Error(`No file row at index ${index}`);
    await rows[index].getByTestId('delete-file-button').click();
  }

  async clickLogout() {
    await this.page.getByTestId('logout-button').click();
  }

  async getLinkNotification() {
    return this.page.getByTestId('link-notification').textContent();
  }

  async getEmptyMessage() {
    await this.waitForLoaded();
    return this.page.getByTestId('empty-state').textContent();
  }
}
