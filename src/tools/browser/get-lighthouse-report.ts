import lighthouse from 'lighthouse'
import { Page } from 'playwright';
import events from 'node:events';

// Currently broken, do not fold, spindle, or mutilate

export async function getLighthouseReport(page: Page) {
  patchPageObject(page);
  // @ts-expect-error Double extra ugly Lighthouse shim
  return lighthouse(page.url(), undefined, undefined, page);
}

function patchPageObject(page: Page) {
  // @ts-expect-error Double extra ugly Lighthouse shim
  page.target = function () {
    return {
      createCDPSession: async function () {
        const session = await page.context().newCDPSession(page);
        // @ts-expect-error Double extra ugly Lighthouse shim
        session.connection = () => new events.EventEmitter();
        return session;
      },
    };
  };
}
