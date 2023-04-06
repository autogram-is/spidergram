import { Cookie, Page } from 'playwright';

export async function getPageCookies(page: Page) {
  return page
    .context()
    .cookies()
    .then(output => {
      return { cookies: output } as Record<string, Cookie[]>;
    });
}
