import { SpiderContext } from '../context.js';
import { HtmlTools } from '../../tools/index.js';
import { fileNameFromHeaders } from '../helpers/mime.js';
import { Readable } from 'stream';
import { save, enqueue } from '../links/index.js';

// Because large feed and sitemap files can be enormous (google limits
// them to 'no more than 50 megabytes'), we store them as file downloads
// that are loaded as needed, rather than body data persisted to Arango.
export async function sitemapHandler(context: SpiderContext) {
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

  // Save the raw XML we've retrieved — we'll retrieve it later.
  const fileName = `sitemaps/'${resource.key}-${fileNameFromHeaders(
    new URL(context.request.url),
    buffer.headers,
  )}`;

  await files('downloads').writeStream(fileName, Readable.from(buffer));
  resource.payload = { bucket: 'downloads', path: fileName };
  await graph.push(resource);

  // Now read it back in
  const xml = await files('downloads').read(fileName);

  // Now parse the sitemap and pull out URLs. Some sites (vanityfair.com is one
  // example) do odd things like sitemap URLs with querystrings

  const links = HtmlTools.findLinksInSitemap(xml.toString());

  const subSitemaps = links.filter(l => l.label === 'sitemap');
  const normalLinks = links.filter(l => l.label !== 'sitemap');

  await save(context, subSitemaps, { handler: 'sitemap' }).then(savedLinks =>
    enqueue(context, savedLinks),
  );
  await save(context, normalLinks).then(savedLinks =>
    enqueue(context, savedLinks),
  );
}
