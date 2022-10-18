import { BrowserCrawlingContext, InternalHttpCrawlingContext, KeyValueStore } from "crawlee";
import { SpiderLocalContext } from "../options.js";
import * as helpers from '../spider-helper.js';

export async function download<C extends InternalHttpCrawlingContext | BrowserCrawlingContext>(context: SpiderLocalContext & C): Promise<void> {
  const { sendRequest } = context;
  context.resource = await helpers.saveResource(context, { files: [] });

  const downloadStore = await KeyValueStore.open('downloads');
  const buffer = sendRequest({ responseType: 'buffer' });
  await downloadStore.setValue(`${context.resource.key}.png`, buffer);

  return;
}