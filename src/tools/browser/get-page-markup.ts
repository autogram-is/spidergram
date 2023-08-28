import { Page } from 'playwright';

/**
 * Iterates through the document, loading the innerHTML of Shadow Dom elements.
 * Note that this does not *recursively* load shadow dom elements; that's a TODO.
 * 
 * @see {@link https://docs.apify.com/academy/node-js/scraping-shadow-doms}
 */
export async function getPageMarkup(page: Page, shadowDom?: boolean) {
  if (shadowDom) {
    return page.evaluate<string>(
      () => {
        for (let el of document.getElementsByTagName('*')) {
          // If element contains shadow root then replace its 
          // content with the HTML of shadow DOM.
          if (el.shadowRoot) el.innerHTML = el.shadowRoot.innerHTML;
        }
        return document.documentElement.outerHTML;
      }
    )
  } else {
    return page.content();
  }
}
