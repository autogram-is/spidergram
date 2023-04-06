import { AqQuery } from "aql-builder";

/**
 * Returns a collection of UniqueUrls that *do not* have accompanying resource
 * entries in the crawl database. This can be a useful starting point for
 * grabbing specific sets of unvisited URLs for follow-up crawls.
 * 
 * @example
 */
export const uncrawledUrls: AqQuery = {
  "document": "uu",
  "collection": "unique_urls",
  "subqueries": [
    {
      "name": 'responses',
      "function": 'count',
      "query": {
        "collection": 'responds_with',
        "document": 'rw',
        "filters": [{ "path": '_from', "eq": 'uu._id', "value": 'dynamic' }],
      }
    },
  ],
  "filters": [
    { "document": false, "name": "responses", "eq": 0 },
    { "name": "parsed.protocol", "in": ["http:", "https:"] },
  ],
};

/**
 * Connects the UniqueURLs, ResondsWith, and Resources collections to count the
 * number of redirects that were encountered when retrieving a page. Only pages
 * that *were* redirected are returned by this query.
 * 
 * The query connects three documents:
 * - uu: UniqueUrls, the default document if none is specified.
 * - rw: RespondsWith, the relationship between a UniqueUrl and a Resource.
 * - rs: Resource, information about the final destination page.
 * 
 * @example Retrieve requests for example.com URLs that were redirected
 * ```
 * const q = new Query(redirects)
 *   .filterBy('parsed.domain', 'example.com')
 * ```
 * 
 * @example Retrieve an array of all redirects for each URL
 * ```
 * const q = new Query(redirects)
 *   .return({ name: 'requested_url', path: 'url')
 *   .return({ name: 'redirect_list', document: 'rw', path: 'redirects' })
 * ```
 * 
 * @example Retrieve redirect chains that ended in an error
 * ```
 * const q = new Query(redirects)
 *   .filterBy({ document: 'rs', path: 'code', eq: 200, negate: true })
 * ```
 */
export const redirects: AqQuery = {
  collection: 'unique_urls',
  document: 'uu',
  subqueries: [
    {
      collection: 'responds_with',
      document: 'rw',
      filters: [
        { 'path': '_from', eq: 'uu._id', value: 'dynamic' },
      ],
    },
    {
      collection: 'resources',
      document: 'rs',
      filters: [
        { 'path': '_id', eq: 'rw._to', value: 'dynamic' },
      ]
    }
  ],
  filters: [
    { path: 'parsed.href', eq: 'rs.parsed.href', value: 'dynamic', negate: true },
    { document: 'rw', path: 'redirects', gt: 1, function: 'count' },
  ],
};


export const resource_inlinks: AqQuery = {
  collection: 'responds_with',
  document: 'rw',
  filters: [{ path: '_to', eq: 'item._id', value: 'dynamic' }],
  subqueries: [
    {
      collection: 'links_to',
      document: 'lt',
      filters: [{ path: '_to', eq: 'rw._from', value: 'dynamic' }],
      subqueries: [
        {
          collection: 'resources',
          document: 'source',
          filters: [{ path: '_id', eq: 'lt._from', value: 'dynamic' }],
        },
      ],
    }
  ],
};

export const resource_outlinks: AqQuery = {
  collection: 'links_to',
  document: 'lt',
  filters: [{ path: '_from', eq: 'item._id', value: 'dynamic' }],
  subqueries: [
    {
      collection: 'unique_urls',
      document: 'target',
      filters: [{ path: '_id', eq: 'lt._to', value: 'dynamic' }],
    }
  ],
};