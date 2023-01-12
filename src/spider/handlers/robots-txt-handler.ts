import { SpiderContext } from '../context.js';
import { fileNameFromHeaders } from '../helpers/mime.js';
import { Readable } from 'stream';
import { saveUrls, enqueueRequests } from '../links/index.js';
import { Robots } from '../../tools/robots.js';
import { FoundLink } from '../../tools/html/find-links.js';

// Very similar to sitemapHandler, but we also stick rulesets in the global
// Robots object for use when filtering URLs.

export async function robotsTxtHandler(context: SpiderContext) {
  const { graph, files, saveResource, sendRequest } = context;
  const resource = await saveResource();

  const buffer = await sendRequest({
    responseType: 'buffer',
    resolveBodyOnly: true,
    allowGetBody: true,
    decompress: true,
    method: 'GET',
    useHeaderGenerator: true,
  });

  // Save the raw text we've retrieved — we'll retrieve it later.
  const fileName = `robotstxt/'${resource.key}-${fileNameFromHeaders(
    new URL(context.request.url),
    buffer.headers,
  )}`;

  await files('downloads').writeStream(fileName, Readable.from(buffer));
  resource.payload = { bucket: 'downloads', path: fileName };
  await graph.push(resource);

  // Read it back in and pass along
  const txt = await files('downloads').read(fileName);
  const hostUrl = new URL(context.request.url);
  hostUrl.pathname = '';
  Robots.setRules(hostUrl, txt.toString());

  if (context.urlOptions.checkSitemaps) {
    const sitemaps = Robots.getSitemaps(hostUrl);
    const links: FoundLink[] = sitemaps.map(s => {
      return { url: s };
    });
    await saveUrls(context, links, { handler: 'sitemap' }).then(savedLinks =>
      enqueueRequests(context, savedLinks),
    );
  }
}
