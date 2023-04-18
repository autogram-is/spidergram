import { AqQuery } from 'aql-builder';

/**
 * Base structures for common Spidergram queries. These fragments DO NOT return
 * complete result sets; instead, they should be used to create a new Query instance,
 * then filters and return values should be chained to create the desired output.
 */
export class QueryFragments {
  static get queries(): Record<string, AqQuery> {
    return {
      pages_crawled: this.pages_crawled,
      pages_linked: this.pages_linked,
      urls_uncrawled: this.urls_uncrawled,
      urls_redirected: this.urls_redirected
    }
  }

  /**
   * Returns a collection of Resources, each with the first URL request record that
   * led to the resource. 
   * 
   * @example Unfiltered return structure:
   * ```
   * [{
   *   resource {
   *     // The query's default document; if no document is specified in a
   *     // filter, aggregate, or return property, it will look here.
   *     ...page properties
   *   },
   *   request {
   *     ...request properties
   *   },
   *   url {
   *     ...original URL properties
   *   },
   * }]
   * ```
   */
  static pages_crawled: AqQuery = {
    metadata: {
      category: 'partial',
      description: "Crawled resources with URL and request data",
    },
    collection: 'resources',
    document: 'resource',
    subqueries: [
      {
        collection: 'responds_with',
        document: 'request',
      },
      {
        collection: 'unique_urls',
        document: 'url',
      },
    ],
    filters: [
      { document: 'request', path: '_to', join: 'resource._id' },
      { document: 'request', path: '_from', join: 'url._id' }
    ],
  };

  /**
   * Returns a collection of Resources with URLs for all inbound and outbound links.
   * 
   * @example Unfiltered return structure:
   * ```
   * [{
   *   resource {
   *     // The query's default document; if no document is specified in a
   *     // filter, aggregate, or return property, it will look here.
   *     ...page properties,
   *     outlinks [
   *       ...unique urls
   *     ],
   *     inlinks [
   *       ...unique urls
   *     ],
   *   },
   * }]
   */
  static pages_linked: AqQuery = {
    metadata: {
      category: 'partial',
      description: "Crawled resources with inlinks and outlinks",
    },
    collection: 'resources',
    document: 'resource',
    subqueries: [
      {
        name: 'inlinks',
        function: 'unique',
        query: {
          collection: 'responds_with',
          document: 'rw',
          filters: [{ path: '_to', join: 'resource._id' }],
          subqueries: [
            {
              collection: 'links_to',
              document: 'lt',
              filters: [{ path: '_to', join: 'rw._from' }],
              subqueries: [
                {
                  collection: 'resources',
                  document: 'source',
                  filters: [{ path: '_id', join: 'lt._from' }],
                },
              ],
            }
          ],
          return: [{ path: 'url', document: 'source' }],
        },
      },
      {
        name: 'outlinks',
        function: 'unique',
        query: {
          collection: 'links_to',
          document: 'lt',
          filters: [{ path: '_from', join: 'resource._id' }],
          subqueries: [
            {
              collection: 'unique_urls',
              document: 'target',
              filters: [{ path: '_id', join: 'lt._to' }],
            }
          ],
          return: [{ path: 'url', document: 'target' }],
        },
      },
    ],
  };

  /**
   * Returns a collection of UniqueUrls that *do not* have accompanying resource
   * entries in the crawl database. This can be a useful starting point for
   * grabbing specific sets of unvisited URLs for follow-up crawls.
   *
   * @example
   */
  static urls_uncrawled: AqQuery = {
    metadata: {
      category: 'partial',
      description: "URLs found but not yet visited",
    },
    collection: 'unique_urls',
    document: 'url',
    subqueries: [
      {
        name: 'responses',
        function: 'count',
        query: {
          collection: 'responds_with',
          document: 'rw',
          filters: [{ path: '_from', join: 'url._id' }],
        },
      },
    ],
    filters: [
      { document: false, name: 'responses', eq: 0 },
      { name: 'parsed.protocol', in: ['http:', 'https:'] },
    ],
  };

  /**
   * Connects the UniqueURLs, ResondsWith, and Resources collections to count the
   * number of redirects that were encountered when retrieving a page. Only pages
   * that *were* redirected are returned by this query.
   *
   * The query connects three documents:
   * - requested: UniqueUrls, the default document if none is specified.
   * - request: RespondsWith, the relationship between a UniqueUrl and a Resource.
   * - received: Resource, information about the final destination page.
   *
   * @example Retrieve requests for example.com URLs that were redirected
   * ```
   * const q = new Query(urls_redirected)
   *   .filterBy('parsed.domain', 'example.com')
   * ```
   *
   * @example Retrieve an array of all redirects for each URL
   * ```
   * const q = new Query(urls_redirected)
   *   .return({ name: 'requested_url', path: 'url')
   *   .return({ name: 'redirect_list', document: 'request', path: 'redirects' })
   *   .return({ name: 'received_url', document: 'received', path: 'url' })
   * ```
   *
   * @example Retrieve redirect chains that ended in an error
   * ```
   * const q = new Query(urls_redirected)
   *   .filterBy({ document: 'received', path: 'code', eq: 200, negate: true })
   * ```
   */
  static urls_redirected: AqQuery = {
    metadata: {
      category: 'partial',
      description: "Redirected URLs and received page data",
    },
    collection: 'unique_urls',
    document: 'requested',
    subqueries: [
      {
        collection: 'responds_with',
        document: 'request',
      },
      {
        collection: 'resources',
        document: 'received',
      },
    ],
    filters: [
      { document: 'request', path: '_from', join: 'requested._id' },
      { document: 'request', path: '_to', join: 'received._id' },
      { document: 'requested', path: 'parsed.href', eq: 'received.parsed.href', value: 'dynamic', negate: true },
      { document: 'request', path: 'redirects', function: 'count', gt: 1 },
    ],
  };
}

