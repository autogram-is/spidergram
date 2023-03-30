import { UrlMutators, ParsedUrl } from '@autogram/url-tools';

export interface NormalizerOptions {
  forceProtocol?: 'https:' | 'http:' | false;
  forceLowercase?:
    | 'host'
    | 'domain'
    | 'subdomain'
    | 'href'
    | 'pathname'
    | false;
  discardSubdomain?: string | false;
  supplySubdomain?: string | false;
  discardAnchor?: boolean;
  discardAuth?: boolean;
  discardIndex?: string | false;
  discardSearch?: string;
  discardTrailingSlash?: boolean;
  sortSearchParams?: boolean;
}

export function globalNormalizer(
  url: ParsedUrl,
  opts: NormalizerOptions = {},
): ParsedUrl {
  if (opts.forceProtocol) UrlMutators.forceProtocol(url, opts.forceProtocol);
  if (opts.forceLowercase)
    url[opts.forceLowercase] = url[opts.forceLowercase].toLocaleLowerCase();
  if (opts.discardSubdomain)
    UrlMutators.stripSubdomains(url, opts.discardSubdomain);
  if (opts.supplySubdomain && url.subdomain.length == 0)
    url.subdomain = opts.supplySubdomain;
  if (opts.discardAnchor) UrlMutators.stripAnchor(url);
  if (opts.discardAuth) UrlMutators.stripAuthentication(url);
  if (opts.discardIndex) UrlMutators.stripIndexPages(url, opts.discardIndex);
  if (opts.discardSearch)
    UrlMutators.stripQueryParameters(url, opts.discardSearch);
  if (opts.discardTrailingSlash) UrlMutators.stripTrailingSlash(url);
  if (opts.sortSearchParams) url.searchParams.sort();
  return url;
}
