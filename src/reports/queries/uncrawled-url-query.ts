import { VerticeQuery, VerticeQueryOptions } from './vertice-query.js';
import { UniqueUrl, aql } from '../../index.js';
import arrify from 'arrify';
import { GeneratedAqlQuery } from 'arangojs/aql.js';

/**
 * Filtering options for Uncrawled URLs.
 */
export interface UncrawledUrlOptions extends VerticeQueryOptions {
  /**
   * Include URLs that were visited but failed or timed out without
   * producing an actual HTTP code.
   *
   * @default false
   */
  includeErrors?: boolean;

  /**
   * One or more UniqueUrl labels
   */
  label?: string | string[];

  /**
   * One or more domains (i.e, 'example.com')
   */
  domain?: string | string[];

  /**
   * One or more hostnames (i.e, 'subdomain.example.com')
   */
  hostname?: string | string[];

  /**
   * A string containing a URL's full or partial pathname. AQL wildcard
   * placeholders (`%`) can be used to specify the substring matching;
   * for exact matches, the pathname should always begin with a forward-slash.
   *
   * @see {link https://www.arangodb.com/docs/3.10/aql/functions-string.html#like|Arango string functions}
   */
  pathname?: string;

  /**
   * A full or partial version of the location where a URL was original found.
   * AQL wildcard placeholders can be used to specify substring matching;
   * if exact matching is used remember that the URL protocol is included.
   *
   * @see {link https://www.arangodb.com/docs/3.10/aql/functions-string.html#like|Arango string functions}
   */
  referer?: string;
}

export class UncrawledUrlQuery extends VerticeQuery<
  UniqueUrl,
  UncrawledUrlOptions
> {
  constructor(options: UncrawledUrlOptions) {
    super({
      ...options,
      collection: 'unique_urls',
    });
  }

  override get filter() {
    const webUrls = aql`FILTER item.parsed != null AND item.parsed.protocol IN ['http:', 'https:']`;
    const domain = this.options.domain
      ? aql`FILTER item.parsed.domain IN ${arrify(this.options.domain)}`
      : undefined;
    const hostname = this.options.hostname
      ? aql`FILTER item.parsed.hostname IN ${arrify(this.options.hostname)}`
      : undefined;
    const pathname = this.options.pathname
      ? aql`FILTER item.parsed.pathname LIKE {$this.options.pathname}`
      : undefined;
    const referer = this.options.referer
      ? aql`FILTER item.parsed.referer LIKE {$this.options.referer}`
      : undefined;
    let visited: GeneratedAqlQuery | undefined;
    if (this.options.includeErrors) {
      visited = aql`
        FOR rw IN responds_with
          FILTER rw._from == item._id
        FOR r IN resources
          FILTER rw._to == r._id
        FILTER (rw._id == null OR r.code == -1)
      `;
    } else {
      visited = aql`
        FOR rw IN responds_with
        FILTER rw._from == item._id AND rw._id == null
      `;
    }

    return aql`
      ${webUrls}
      ${domain}
      ${hostname}
      ${pathname}
      ${referer}
      ${visited}
    `;
  }
}
