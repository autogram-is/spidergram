import { gotScraping, HTTPError, Progress, Response, RequestError, Options } from "got-scraping";
import { Fetcher, FetcherOptions } from "./fetcher.js";
import { Entity, UniqueUrl, HeaderShape, RequestShape, ResponseShape, Status, Resource, RespondsWith } from '../graph/index.js';

const gotDefaultOptions = {
  throwHttpErrors: false,
  followRedirect: true,
};
export class GotFetcher extends Fetcher {
  check(uu: UniqueUrl, ...args: unknown[]): Promise<Entity[]> {
    const customHeaders = uu.referer ? { referer: uu.referer } : {};
    const requestOptions = {
      headers: this.buildRequestHeaders(customHeaders),
      ...gotDefaultOptions,
    };

    const result: Entity[] = [];
    return new Promise((resolve, reject) => {
      gotScraping.head(uu.url, requestOptions)
        .then((res: Response) => {
          resolve(this.statusFromHead(uu, res));
        })
        .catch((reason: unknown) => {
          if (reason instanceof RequestError) {
            resolve(this.statusFromError(uu, reason));
          }
          else reject(reason);
        });
    });
  }

  fetch(uu: UniqueUrl, ...args: unknown[]): Promise<Entity[]> {
    const customHeaders = uu.referer ? { referer: uu.referer } : {};
    const requestOptions = {
      headers: this.buildRequestHeaders(customHeaders),
      ...gotDefaultOptions,
    };

    const result: Entity[] = [];
    return new Promise((resolve, reject) => {
      const stream = gotScraping.stream(uu.url, requestOptions)
        .once('response', (response: Response) => {

        })
        .on('downloadProgress', (progress: Progress) => {
          this.emit('downloadProgress', uu, progress);
        })
        .once('error', (err: Error) => {});
    });
  }



  private statusFromHead(uu: UniqueUrl, res: Response): Entity[] {
    const req: RequestShape = {
      method: res.request.options.method ?? 'HEAD',
      url: res.url,
      headers: res.request.options.headers,
      body: res.request.options.body?.toString()
    };
    const s = new Status(res.url, res.statusCode, res.statusMessage, res.headers);
    const rw = new RespondsWith(uu, s, req);
    return [s, rw];
  }

  private statusFromError(uu: UniqueUrl, err: RequestError): Entity[] {
    const req: RequestShape = {
      url: uu.url,
      method: err.response?.request.options.method ?? 'GET',
      headers: err.response?.request.options.headers ?? {},
      body: err.response?.request.options.body?.toString() ?? ''
    };
    const s = new Status(uu.url, -1, `${err.name} ${err.code} ${err.message}`, err.response?.headers ?? {});
    const rw = new RespondsWith(uu, s, req);
    return [s, rw];
  }
}