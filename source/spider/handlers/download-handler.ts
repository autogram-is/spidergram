import { KeyValueStore } from "crawlee";
import { fileNameFromHeaders } from "../helpers/mime.js";
import { CombinedContext } from "../context.js";

export async function downloadHandler(context: CombinedContext & { sendRequest: Function }): Promise<void> {
  const { sendRequest, saveResource, storage } = context;
  context.resource = await saveResource();

  // This should be replaced by something that isn't dependent on
  // Crawlee's relatively generic KVS implementation
  const downloadStore = await KeyValueStore.open('downloads');
  const buffer = await sendRequest({ responseType: 'buffer' });
  const fileName = context.resource.key + '-' + fileNameFromHeaders(new URL(buffer.url), buffer.headers);
  await downloadStore.setValue(fileName, buffer);

  context.resource.downloads = [fileName];
  await storage.push(context.resource);
  return Promise.resolve();
}