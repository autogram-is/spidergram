import { SpiderContext } from '../context.js';
import { helpers } from '../index.js';

export async function requestPrecheck(context: SpiderContext): Promise<void> {
  const {
    log,
    request,
    prefetchRequest,
    downloadMimeTypes,
    parseMimeTypes,
  } = context;

  // prefetchRequest also sticks requestMeta into the crawl context,
  // so its header information can be used later even if skipNavigation
  // is true.
  const requestMeta = await prefetchRequest();

  try {
    const { type } = helpers.parseContentType(requestMeta);
    requestMeta.type = type;
  } catch(error: unknown) {
    if (error instanceof TypeError) {
      requestMeta.type = 'unknown/unknown';
    } else {
      throw error;
    }
  }

  // For a lot of cases, we can skip the full load and treat it as
  // a simple status check.
  request.skipNavigation = true;

  if (requestMeta.statusCode < 199 || requestMeta.statusCode > 399) {
    // Anything outside of the 200-300 zone, we override the label with 'status'
    // to ensure processing halts. For some sites (if the 404 page returns
    // important content, for example) this might merit overriding.
    request.label = 'status';
  } else if (helpers.mimeMatches(requestMeta.type, parseMimeTypes)) {
    // This is our default case; run the full page request pipeline
    // and set the label to 'page'.
    request.label ??= 'page';
    request.skipNavigation = false;
  } else if (helpers.mimeMatches(requestMeta.type, downloadMimeTypes)) {
    // Technically we can't parse AND download with this setup, we may
    // want to deal with that someday.
    request.label ??= 'download';
  } else {
    // If none of our other checks matched, and no label was assigned 
    // to the request, we fall back to 'status'.
    request.label ??= 'status';
  }

  log.debug(
    `Routed ${request.url}: ${request.label} (HTTP ${requestMeta.statusCode}, ${requestMeta.type})`,
  );
}
