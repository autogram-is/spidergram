import { getAxeReport, formatAxeReport } from '../../tools/browser/get-axe-report.js';
import { SpiderContext } from '../context.js';

export async function pageHandler(context: SpiderContext) {
  const { saveResource, enqueueUrls, page } = context;

  const body = await page.content();
  const cookies = context.saveCookies
    ? await page.context().cookies()
    : undefined;

  const accessibility = context.auditAccessibility
    ? await getAxeReport(page).then(results => 
      context.auditAccessibility === 'summary' ? formatAxeReport(results) : results
    )
    : undefined;

  await saveResource({ body, cookies, accessibility });
  await enqueueUrls();

  return Promise.resolve();
}
