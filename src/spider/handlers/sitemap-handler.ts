import { Duplex } from 'node:stream';
import { SpiderContext } from '../context.js';
import { HtmlTools } from '../../tools/index.js';
import { fileNameFromHeaders } from '../helpers/mime.js';
import { saveUrls, enqueueRequests } from '../links/index.js';
import { Project } from '../../index.js';
import { ensureDir } from "fs-extra";
import path from 'node:path';

// Because large feed and sitemap files can be enormous (google limits
// them to 'no more than 50 megabytes'), we store them as file downloads
// that are loaded as needed, rather than body data persisted to Arango.
export async function sitemapHandler(context: SpiderContext) {
  const { graph, files, saveResource } = context;
  const resource = await saveResource();

  const response = await fetch(resource.parsed)
  .then(r => {
    if (r.status !== 200) throw new Error('Could not download');
    return r;
  });

  if (response.body) {
    const fileName =
      resource.key +
      '-' +
      fileNameFromHeaders(new URL(resource.url), resource.headers);

    const directory = path.join(resource.parsed.hostname.replaceAll('.', '-'), resource.mime?.replaceAll('/', '-') ?? 'unknown');
    const proj = await Project.config();
    await ensureDir(path.join(proj.root ?? '.', 'storage', 'downloads', directory));
    const fullPath = path.join(directory, fileName);
    await files('downloads').writeStream(fullPath, Duplex.from(response.body));

    resource.payload = { bucket: 'downloads', path: fullPath };
    await graph.push(resource);

    // Now read it back in
    const xml = await files('downloads').read(fileName);

    // Now parse the sitemap and pull out URLs. Some sites (vanityfair.com is one
    // example) do odd things like sitemap URLs with querystrings

    const links = HtmlTools.findSitempLinks(xml.toString());

    const subSitemaps = links.filter(l => l.label === 'sitemap');
    const normalLinks = links.filter(l => l.label !== 'sitemap');

    await saveUrls(context, subSitemaps, { handler: 'sitemap' }).then(
      savedLinks => enqueueRequests(context, savedLinks),
    );
    await saveUrls(context, normalLinks).then(savedLinks =>
      enqueueRequests(context, savedLinks),
    );
  }
  return Promise.resolve();
}
