import {PlaywrightGotoOptions} from 'crawlee';
import {SpiderContext} from '../context.js';
import {helpers} from '../index.js';

export async function defaultRouter(context: SpiderContext, options: PlaywrightGotoOptions): Promise<void> {
  const {log, request, uniqueUrl, prefetchRequest, downloadMimeTypes, parseMimeTypes} = context;
  const requestMeta = await prefetchRequest();

  // Our big point of differentiation here is content-type;
  // URL based checks are already performed by the time we enqueue.
  const {type} = helpers.parseContentType(requestMeta);

  // For a lot of cases, we can skip the full load and treat it as
  // a simple status check.
  request.skipNavigation = true;
  request.label ??= 'status';

  if (requestMeta.statusCode < 199 || requestMeta.statusCode > 399) {
    // Anything outside of the 200-300 zone, we'll just log a status message.
    // For some sites (if the 404 page returns important content, for example)
    // this might merit overriding.
    request.label = 'status';
  } else if (uniqueUrl?.parsed?.pathname.endsWith('/sitemap.xml')) {
    // This is a relatively crude approach to detecting sitemaps;
    // in the future we'll want to check for sitemap indexes, and
    // custom sitemaps listed in robots.txt
    request.label = 'sitemap';
  } else if (parseMimeTypes?.includes(type)) {
    // This is our default case; run the full page request pipeline
    // and set the label to 'page'.
    request.label = 'page';
    request.skipNavigation = false;
  } else if (downloadMimeTypes?.includes(type)) {
    // Technically we can't parse AND download with this setup,
    // but that would be a fairly rare case.
    request.label = 'download';
  }

  log.debug(`Routed ${request.url}: ${request.label} (HTTP ${requestMeta.statusCode}, ${type})`);
}
