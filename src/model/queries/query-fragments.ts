import { AqQuery } from "aql-builder";

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
    { "name": "parsed.protocol", "in": [ "https:", "http:" ] },
    { "document": false, "name": "responses", "eq": 0 },
  ],
}

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
    { path: 'parsed.protocol', in: ['https:', 'http:'] },
    { path: 'parsed.href', eq: 'rs.parsed.href', value: 'dynamic', negate: true },
    { document: 'rw', path: 'redirects', gt: 1, function: 'count' },
  ],
  return: [
    { name: 'requested', document: 'uu', path: 'url' },
    { name: 'redirects', document: 'rw', path: 'redirects' },
    { name: 'redirectCount', document: 'rw', path: 'redirects', function: 'count' },
    { name: 'received', document: 'rs', path: 'url' },
    { name: 'status', document: 'rs', path: 'code' }
  ]
}