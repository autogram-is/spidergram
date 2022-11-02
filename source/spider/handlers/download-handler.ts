import {fileNameFromHeaders} from '../helpers/mime.js';
import {SpiderContext} from '../context.js';
import {Readable} from 'node:stream';

export async function downloadHandler(context: SpiderContext): Promise<void> {
  const {graph, files, saveResource, sendRequest} = context;
  const resource = await saveResource();

  // Ensure there's a downloads directory in our filestore
  await files().exists('./downloads')
    .then(exists => {
      if (!exists) files().createDirectory('./downloads');
    });

  const buffer = await sendRequest({responseType: 'buffer', allowGetBody: true, decompress: true, method: 'GET'});
  const fileName = './downloads/' + resource.key + '-' + fileNameFromHeaders(new URL(buffer.url), buffer.headers);
  await files().writeStream(fileName, Readable.from(buffer))
  
  resource.payload = fileName;
  await graph.push(resource);
}