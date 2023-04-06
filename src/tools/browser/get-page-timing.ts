import { Page } from 'playwright';

export async function getPageTiming(page: Page) {
  return page.evaluate(() => performance.getEntriesByType('navigation').pop());
}
