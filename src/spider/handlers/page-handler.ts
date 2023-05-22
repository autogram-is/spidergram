import { getPageMarkup } from '../../tools/browser/get-page-markup.js';
import { BrowserTools } from '../../tools/index.js';
import { SpiderContext } from '../context.js';

export async function pageHandler(context: SpiderContext) {
  const { saveResource, enqueueUrls, page } = context;

  const body = await getPageMarkup(page, context.shadowDom);

  const cookies = context.saveCookies
    ? await page.context().cookies()
    : undefined;

  const timing = context.savePerformance
    ? await BrowserTools.getPageTiming(page)
    : undefined;

  const xhr = context.saveXhrList
    ? await BrowserTools.getXhrList(page)
    : undefined;

  const accessibility = context?.auditAccessibility
    ? await BrowserTools.AxeAuditor.getAuditResults(
        page,
        context?.auditAccessibility,
      )
    : undefined;

  await saveResource({ body, cookies, xhr, accessibility, timing });
  await enqueueUrls();

  return Promise.resolve();
}
