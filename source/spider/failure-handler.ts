import { Request } from "crawlee";
import { SpidergramCrawlingContext } from "./context.js";
import { UniqueUrl, Resource, RespondsWith } from '../model/index.js';
import { IncomingMessage } from "http";

export async function failedRequestHandler(request: Request, response: IncomingMessage, error: Error, spidergram: SpidergramCrawlingContext) {
  const { storage } = spidergram;
  const ru = UniqueUrl.fromJSON(request.userData);

  const rs = new Resource({
    url: response.url ?? request.loadedUrl ?? request.url,
    code: response.statusCode ?? -1,
    message: `${response.statusMessage} (${error.name} ${error.message})`,
    headers: response.headers ?? {}
  });

  const rw = new RespondsWith({
    url: ru,
    resource: rs,
    method: request.method,
    headers: request.headers ?? {}
  })

  await storage.add([ru, rw]);
  console.log(`${request.url} (Response: ${response.statusCode})`);
}