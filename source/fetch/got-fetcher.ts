import is from '@sindresorhus/is';
import { gotScraping, Response, RequestError } from "got-scraping";
import { Fetcher } from "../fetch/index.js";
import { Entity, UniqueUrl, RequestShape, ResponseShape, Status, Resource, RespondsWith } from '../graph/index.js';
import { DownloaderHelper, DownloadEndedStats, DownloaderHelperOptions } from 'node-downloader-helper';
import mkdirp from 'mkdirp';

const gotDefaultOptions = {
  throwHttpErrors: false,
  followRedirect: true,
};

export class GotFetcher extends Fetcher {

  async fetch(uu: UniqueUrl, ...args: unknown[]): Promise<Entity[]> {
    const customHeaders = uu.referer ? { referer: uu.referer } : {};
    const requestOptions = {
      headers: this.buildRequestHeaders(customHeaders),
      ...gotDefaultOptions,
    };
    return new Promise((resolve, reject) => {
      gotScraping(uu.url, requestOptions)
        .then((response: Response) => {
          const shape = this.normalizeResponseShape(response);
          if (this.rules.discard(shape)) {
            resolve(new Array<Entity>(uu));
          } else if (this.rules.download(shape)) {
            resolve(this.downloadedResource(uu, response));
          } else if (this.rules.store(shape)) {
            resolve(this.savedResource(uu, response));
          } else {
            resolve(this.responseStatus(uu, response));
          }  
        })
        .catch((error: unknown) => {
          if (error instanceof RequestError) {
            resolve(this.errorStatus(uu, error));
          }
          else throw error;
        });
    });
  }

  protected async downloadedResource(uu: UniqueUrl, res: Response): Promise<Entity[]> {
    const req = this.normalizeRequestShape(res);
    const resource = new Resource(
      res.url,
      res.statusCode,
      res.statusMessage,
      res.headers
    );
    const rw = new RespondsWith(uu, resource, req);

    const directory = [this.downloadDirectory, resource.id].join('/');
    mkdirp.sync(directory);

    const downloadOptions: DownloaderHelperOptions = {
      body: req.body,
      retry: true,
      headers: req.headers,
    };

    return new Promise((resolve, reject) => {
      new DownloaderHelper(uu.url, directory, downloadOptions)
        .on('end', (info: DownloadEndedStats) => {
          resource.filePath = info.fileName;
          resolve([resource, rw]);
        })
        .on('error', (err: unknown) => console.log('Download Failed', err))
        .start().catch((err: unknown) => console.error(err));
      });
  }

  protected async savedResource(uu: UniqueUrl, res: Response): Promise<Entity[]> {
    return new Promise((resolve) => {
      const req = this.normalizeRequestShape(res);
      let resource = new Resource(
        res.url,
        res.statusCode,
        res.statusMessage,
        res.headers,
        res.rawBody.toString()
      );
      const rw = new RespondsWith(uu, resource, req);
      resolve([resource, rw]);
    });
  }

  protected responseStatus(uu: UniqueUrl, res: Response): Entity[] {
    const req = this.normalizeRequestShape(res);
    const s = new Status(res.url, res.statusCode, res.statusMessage, res.headers);
    const rw = new RespondsWith(uu, s, req);
    return [s, rw];
  }

  protected errorStatus(uu: UniqueUrl, err: RequestError): Entity[] {
    let req: RequestShape;
    if (is.object(err.response)) {
      req = this.normalizeRequestShape(err.response);
    } else {
      req = {
        method: 'GET',
        url: uu.url,
        headers: {},
      }
    }
    const s = new Status(uu.url, -1, `${err.name} ${err.code} ${err.message}`, err.response?.headers ?? {});
    const rw = new RespondsWith(uu, s, req);
    return [s, rw];
  }

  protected normalizeResponseShape(res: Response): ResponseShape {
    const rs: ResponseShape = {
      url: res.url,
      headers: res.request.options.headers,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage
    }
    return rs;
  }

  protected normalizeRequestShape(res: Response): RequestShape {
    const rs: RequestShape = {
      method: res.request.options.method,
      url: res.url,
      headers: res.request.options.headers,
      body: res.request.options.body?.toString(),
    }
    return rs;
  }
}