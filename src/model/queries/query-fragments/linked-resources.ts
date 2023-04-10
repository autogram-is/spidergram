import { AqQuery } from 'aql-builder';

/**
 * Returns crawled resources, the resources that have inbound links to them, and
 * the unique_urls they have outbound links to.
 *
 * For query building:
 * - item: (Resource) the complete crawl data for the page in question. Default
 *   document if none is specified.
 * - inbound: (LinksTo + Resources) Resources that link to the current resource.
 * - outbound: (RespondsWith + UniqueUrls) UniqueUrls the current resources links to.
 */
export const linked_resources: AqQuery = {
  metadata: {
    category: 'Core',
    description: "Crawled pages with inbound and outbound links",
  },
  collection: 'resources',
  document: 'page',
  subqueries: [
    {
      name: 'inbound',
      function: 'unique',
      query: {
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
        return: [{ path: 'source' }],
      },
    },
    {
      name: 'outbound',
      function: 'unique',
      query: {
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
        return: [{ path: 'target' }],
      },
    },
  ],
};
