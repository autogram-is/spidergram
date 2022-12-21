import { Page } from 'playwright';

export async function getGoogleTagData(page: Page) {
  return page.evaluate<unknown[]>(
    '() => JSON.parse(JSON.stringify(window.dataLayer ?? []))',
  );
}
