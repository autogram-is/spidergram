import { Request } from 'crawlee';
import { UniqueUrl } from '../../model/index.js';

export function buildRequests(urls: UniqueUrl[]) {
  return urls
    .filter(uu => uu.parsable)
    .map(uu => new Request({
      url: uu.url,
      uniqueKey: uu.key,
      headers: { referer: uu.referer ?? '' },
      userData: uu.toJSON()
    }));
}