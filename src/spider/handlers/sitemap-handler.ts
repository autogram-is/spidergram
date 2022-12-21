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
  const fileName =
    resource.key +
    '-' +
    fileNameFromHeaders(new URL(buffer.url), buffer.headers);
  await files('downloads').writeStream(fileName, Readable.from(buffer));
  resource.files.push({ bucket: 'downloads', filename: fileName });
  await graph.push(resource);

  // Now parse the sitemap and pull out URLs.
  const links = HtmlTools.findLinksInSitemap(buffer.body);
  await save(context, links).then(savedLinks => enqueue(context, savedLinks));
}
