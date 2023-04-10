import { AqQuery } from 'aql-builder';

/**
 * Connects crawled resources to the Unique URL records that were used to crawl them.
 * This makes it possible to bring up a page or downloaded tem, the original unique URL
 * that was requested during the crawl, and any redirects that occurred during its retrieval.
 *
 * For query building:
 * - requested: (UniqueUrl) information about the oringal saved URL for the page.
 * - request:  (RespondsWith) the relationship between a UniqueURL and a Resource.
 * - delievred: (Resource) the complete crawl data for the page. This document is 
 *   the default if none is specified.
 */
export const resources: AqQuery = {
  metadata: {
    category: 'Core',
    description: "Crawled pages with original url and request data",
  },
  collection: 'resources',
  document: 'delivered',
  subqueries: [
    {
      collection: 'unique_urls',
      document: 'requested',
    },
    {
      collection: 'responds_with',
      document: 'request',
      filters: [
        { path: '_from', eq: 'request._id', value: 'dynamic' },
        { path: '_to', eq: 'delivered._id', value: 'dynamic' }
      ],
    },
  ],
};
