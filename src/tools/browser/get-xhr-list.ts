import { Page } from 'playwright'

/**
 * Requrns a list of XmlHttpReequests initiated during page load.
 * 
 * This approach is absolutely not guranteed to be complete; we need to
 * listen via page.on() for that, but this is OK for the moment.
 */
export async function getXhrList(page: Page) {
  return page.evaluate(() =>
    performance.getEntriesByType('resource').filter(
      entry => entry.toJSON().initiatorType === 'xmlhttprequest'
    ).map(entry => entry.name)
  )
}
