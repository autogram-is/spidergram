import { Graph, Fetch } from '../../source/index.js';
import { got, Progress } from 'got-scraping';
import { UniqueUrl, Entity } from '../../source/graph/index.js';
import { StreamDownloader } from '../../source/fetch/stream-downloader.js';
import { ParsedUrl } from '@autogram/url-tools';


const uu = new Graph.UniqueUrl('https://example.com');
const headers: Graph.HeaderShape = {
  referer: 'https://google.com',
}

const f = new Fetch.GotFetcher()
  .on('status', (uu: UniqueUrl, statusCode: number) => console.log(`HTTP ${statusCode} - ${uu.url}`))
  .on('save', (uu: UniqueUrl, statusCode: number) => console.log(`Saved - ${uu.url}`))
  .on('download', (uu: UniqueUrl) => console.log(`Downloading - ${uu.url}`))
  .on('downloadProgress', (uu: UniqueUrl, progress: Progress) => console.log(`Downloading (${progress.percent}%) - ${uu.url}`))
  .on('error', (err: Error) => console.log(`ERROR ${err}`))

f.check(uu, headers)
  .then((ent: Entity[]) => console.log(ent))
  .catch((reason: any) => console.log(reason));
