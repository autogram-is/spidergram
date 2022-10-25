import {KeyValueStore} from 'crawlee';
import {fileNameFromHeaders} from '../helpers/mime.js';
import {CombinedContext} from '../context.js';

export async function downloadHandler(context: CombinedContext): Promise<void> {
  const {storage, saveResource, sendRequest} = context;
  context.resource ??= await saveResource();

  // This should be replaced by something that isn't dependent on
  // Crawlee's relatively generic KVS implementation
  const downloadStore = await KeyValueStore.open('downloads');
  const buffer = await sendRequest({responseType: 'buffer', allowGetBody: true, decompress: true, method: 'GET'});
  const fileName = context.resource.key + '-' + fileNameFromHeaders(new URL(buffer.url), buffer.headers).split('.').slice(0, -1).join('.');
  await downloadStore.setValue(fileName, buffer.body, { contentType: buffer.headers['content-type']});
  context.resource.downloads = [fileName];
  await storage.push(context.resource);
}
