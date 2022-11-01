import {CombinedContext} from '../context.js';
import {downloadListOfUrls} from 'crawlee';

export async function sitemapHandler(context: CombinedContext) {
  const {request, saveResource, saveUrls, saveRequests} = context;
  context.resource ??= await saveResource();
  
  const urls = await downloadListOfUrls({ url: request.url });
  const uniqueUrls = await saveUrls(urls.map(
    url => { return { href: url, label: 'sitemap' } }
  ));
  await saveRequests(uniqueUrls);
}
