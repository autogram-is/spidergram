import { AqQuery } from "aql-builder";

/**
 * Returns a collection of UniqueUrls with a count of crawl responses.
 * 
 * Adding a 'crawled == 0' or 'crawled > 0' filter is a starting point for 
 * filtered lists of crawled or uncrawled data.
 */
export const urls: AqQuery = {
  metadata: {
    category: 'Core',
    description: "Found URLs with crawl count and inlinks",
  },
  collection: 'unique_urls',
  document: 'uu',
  subqueries: [{
    name: 'inlinks',
    function: 'unique',
    query: {
      collection: 'links_to',
      document: 'link',
      filters: [{ path: '_to', eq: 'uu._id', value: 'dynamic' }],
      subqueries: [{
        collection: 'resources',
        document: 'source',
        filters: [{ path: '_id', eq: 'link._from', value: 'dynamic' }],
      }],
    },
  }, {
    name: 'crawled',
    function: 'count',
    query: {
      collection: 'responds_with',
      document: 'rw',
      filters: [{ path: '_from', eq: 'urls._id', value: 'dynamic' }],
    },
  }],
};
