import {downloadListOfUrls} from 'crawlee';
import {SpiderContext} from '../context.js';

// Because large feed and sitemap files can be enormous (google limits
// them to 'no more than 50 megabytes'), we store them as file downloads
// that are loaded as needed, rather than body data persisted to Arango.

export async function sitemapHandler(context: SpiderContext) {
  const {request, saveResource, saveUrls, saveRequests} = context;
  await saveResource();

  const urls = await downloadListOfUrls({url: request.url});
  const uniqueUrls = await saveUrls(urls.map(
    url => ({url: url, label: 'sitemap'}),
  ));
  await saveRequests(uniqueUrls);
}