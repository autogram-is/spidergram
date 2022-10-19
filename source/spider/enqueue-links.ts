// Drop-in replacement for the enqueueLinks function included
// in Crawlee's global context. Ours has a few additional options
// and handles Spidergram-specific grunt work:
//
// 1. An additional 'same directory' discovery strategy
// 2. Allow UrlFilter and UrlFilterWithContext functions for more
//    complex link filtering logic
// 3. Allow dictionaries of selectors/globs/filters in addition to
//    arrays; the key is saved on SpiderGram's link record, for
//    later use categorizing internal links.  
// 4. Build UniqueUrl and LinkTo entities for Spidergram in addition
//    to Crawlee Request objects; use SpiderContext UrlFilters to
//    determine which ones are ignored, saved or enqueued.

import { EnqueueLinksOptions } from "crawlee";


export function playwrightSpiderEnqueueLinks(options: EnqueueLinksOptions) {

}