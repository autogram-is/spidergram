import {CheerioCrawlingContext, KeyValueStore, PlaywrightCrawlingContext } from "crawlee";
import { SpiderLocalContext } from "../options.js";
import { fileNameFromHeaders } from "../mime.js";
import { URL } from 'node:url';
import * as helpers from '../spider-helper.js';

export async function download(context: SpiderLocalContext & (CheerioCrawlingContext | PlaywrightCrawlingContext)): Promise<void> {
  const { sendRequest, storage } = context;
  context.resource = await helpers.saveResource(context);

  const downloadStore = await KeyValueStore.open('downloads');
  const buffer = await sendRequest({ responseType: 'buffer' });
  const fileName = context.resource.key + '-' + fileNameFromHeaders(new URL(buffer.url), buffer.headers);
  await downloadStore.setValue(fileName, buffer);

  context.resource.downloads = [fileName];
  await storage.push(context.resource);
  return Promise.resolve();
}