import { UrlMutators, ParsedUrl } from '@autogram/url-tools';
import minimatch from 'minimatch';

type urlStringProps =
  | 'protocol'
  | 'subdomain'
  | 'domain'
  | 'host'
  | 'hostname'
  | 'pathname'
  | 'search'
  | 'hash';

export interface NormalizerOptions {
  /**
   * Coerce the URL's protocol; primarily useful for changing http: to https:
   */
  forceProtocol?: 'https:' | 'http:' | false;

  /**
   * Run a portion of the domain through strToLower().
   */
  forceLowercase?: string | string[] | boolean;

  /**
   * Discard the entire subdomain if it matches a glob pattern.
   */
  discardSubdomain?: string | false;

  /**
   * Discard the first segment of the hostname if it matches a glob pattern.
   */
  discardFirstSegment?: string | false;

  /**
   * If the url's subdomain is empty, use the one specified.
   */
  supplySubdomain?: string | false;

  /**
   * Remove the URL anchor/hashtag if it exists.
   */
  discardAnchor?: boolean;

  /**
   * Remove the URL authentication fields (username and password) if they exist.
   */
  discardAuth?: boolean;

  /**
   * Remove the port number if it matches a glob pattern.
   */
  discardPort?: string | boolean;

  /**
   * If the pathname matches the supplied pattern, remove its final segment.
   *
   * Useful for stripping `/index.html` and `/Default.aspx` style filenames that
   * fall back to `/` on well-configured servers.
   */
  discardIndex?: string | false;

  /**
   * Discard any search/querystring parameters whose names match the supplied pattern.
   */
  discardSearch?: string;

  /**
   * Remove the trailing slash from the URL path if it exists. This is risky depending on
   * the server configuration.
   */
  discardTrailingSlash?: boolean;

  /**
   * For any search/querystring parameters whose names match the supplied pattern, collapse
   * multiple values and use only the last one.
   * 
   * @example
   * ```
   * const url = new ParsedUrl('https://example.com/search.html?page=1&page=2&page=3');
   * const newUrl = globalNormalizer(url, { collapseSearchParams: 'page' });
   * console.log(newUrl.href);
   * // https://example.com/search.html?page=3
   * ```
   */
  collapseSearchParams?: string

  /**
   * Alphabetize any search/querystring parameters, so links that supply params in different
   * orders are not incorrectly flagged as different URLs.
   */
  sortSearchParams?: boolean;
}

export function globalNormalizer(
  url: ParsedUrl,
  opts: NormalizerOptions = {},
): ParsedUrl {
  if (opts.forceProtocol) UrlMutators.forceProtocol(url, opts.forceProtocol);

  if (opts.forceLowercase) {
    if (opts.forceLowercase === true) {
      url.href = url.href.toLocaleLowerCase();
    } else {
      const props = Array.isArray(opts.forceLowercase)
        ? opts.forceLowercase
        : [opts.forceLowercase];
      for (const prop of props) {
        url[prop as urlStringProps] =
          url[prop as urlStringProps].toLocaleLowerCase();
      }
    }
  }

  if (opts.discardSubdomain)
    UrlMutators.stripSubdomains(url, opts.discardSubdomain);

  if (opts.discardFirstSegment) {
    const segments = url.subdomain.split('.');
    if (minimatch(segments[0] ?? 0, opts.discardFirstSegment)) {
      segments.shift();
      url.subdomain = segments.join('.');
    }
  }

  if (opts.supplySubdomain && url.subdomain.length == 0)
    url.subdomain = opts.supplySubdomain;

  if (opts.discardAnchor) {
    url.hash = '';
  }
  if (opts.discardAuth) {
    url.username = '';
    url.password = '';
  }

  if (opts.discardPort) {
    if (
      opts.discardPort === true ||
      minimatch(url.port.toString(), opts.discardPort)
    )
      url.port = '';
  }

  if (opts.discardIndex) UrlMutators.stripIndexPages(url, opts.discardIndex);

  if (opts.discardSearch)
    UrlMutators.stripQueryParameters(url, opts.discardSearch);

  if (opts.discardTrailingSlash) UrlMutators.stripTrailingSlash(url);

  if (opts.collapseSearchParams) {
    const collapse = opts.collapseSearchParams;
    const keys = ([...new Set(url.searchParams.keys()).values()]);
    for (const key of keys) {
      if (collapse === true || minimatch(key, collapse)) {
        const value = url.searchParams.getAll(key).pop();
        if (value) url.searchParams.set(key, value);
      }
    }
  }

  if (opts.sortSearchParams) url.searchParams.sort();

  return url;
}
