import { Readable } from 'node:stream';
import { fileNameFromHeaders } from '../helpers/mime.js';
import { SpiderContext } from '../context.js';

export async function downloadHandler(context: SpiderContext): Promise<void> {
  const { graph, files, saveResource, sendRequest } = context;
  const resource = await saveResource();

  const buffer = await sendRequest({
    responseType: 'buffer',
    resolveBodyOnly: true,
    allowGetBody: true,
    decompress: true,
    method: 'GET',
  });

  const fileName =
    resource.key +
    '-' +
    fileNameFromHeaders(new URL(buffer.url), buffer.headers);
  await files('downloads').writeStream(fileName, Readable.from(buffer.rawBody));

  resource.payload = { bucket: 'downloads', path: fileName };
  await graph.push(resource);
}
