import {downloadListOfUrls} from 'crawlee';
import {SpiderContext} from '../context.js';

export async function sitemapHandler(context: SpiderContext) {
  const {request, saveResource, saveUrls, saveRequests} = context;
  await saveResource();

  const urls = await downloadListOfUrls({url: request.url});
  const uniqueUrls = await saveUrls(urls.map(
    url => ({href: url, label: 'sitemap'}),
  ));
  await saveRequests(uniqueUrls);
}
