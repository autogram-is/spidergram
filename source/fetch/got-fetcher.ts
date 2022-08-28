import * as fs from 'node:fs';
import is from '@sindresorhus/is';
import { gotScraping, Response, RequestError } from 'got-scraping';
import mkdirp from 'mkdirp';
import { Fetcher } from '../fetch/index.js';
import {
  Entity,
  UniqueUrl,
  RequestShape,
  ResponseShape,
  Status,
  Resource,
  RespondsWith,
} from '../graph/index.js';
import { getResponseFilename } from '../fetch/get-response-filename.js';

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
            resolve([uu]);
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
          } else throw error;
        });
    });
  }

  protected async downloadedResource(
    uu: UniqueUrl,
    res: Response,
  ): Promise<Entity[]> {
    const request = this.normalizeRequestShape(res);
    const resource = new Resource(
      res.url,
      res.statusCode,
      res.statusMessage,
      res.headers,
    );
    const rw = new RespondsWith(uu, resource, request);

    const directory = [this.workingDirectory, 'downloads', resource.id].join(
      '/',
    );
    mkdirp.sync(directory);
    const fileName = getResponseFilename(res.headers, uu.parsed!);
    const filePath = [directory, fileName].join('/');

    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, res.rawBody, (error: unknown) => {
        if (is.error(error)) reject(error);
        resource.filePath = filePath;
        resolve([resource, rw]);
      });
    });
  }

  protected async savedResource(
    uu: UniqueUrl,
    res: Response,
  ): Promise<Entity[]> {
    return new Promise((resolve) => {
      const request = this.normalizeRequestShape(res);
      const resource = new Resource(
        res.url,
        res.statusCode,
        res.statusMessage,
        res.headers,
        res.rawBody.toString(),
      );
      const rw = new RespondsWith(uu, resource, request);
      resolve([resource, rw]);
    });
  }

  protected responseStatus(uu: UniqueUrl, res: Response): Entity[] {
    const request = this.normalizeRequestShape(res);
    const s = new Status(
      res.url,
      res.statusCode,
      res.statusMessage,
      res.headers,
    );
    const rw = new RespondsWith(uu, s, request);
    return [s, rw];
  }

  protected errorStatus(uu: UniqueUrl, error: RequestError): Entity[] {
    let request: RequestShape;
    if (is.object(error.response)) {
      request = this.normalizeRequestShape(error.response);
    } else {
      request = {
        method: 'GET',
        url: uu.url,
        headers: {},
      };
    }

    const s = new Status(
      uu.url,
      -1,
      `${error.name} ${error.code} ${error.message}`,
      error.response?.headers ?? {},
    );
    const rw = new RespondsWith(uu, s, request);
    return [s, rw];
  }

  protected normalizeResponseShape(res: Response): ResponseShape {
    const rs: ResponseShape = {
      url: res.url,
      headers: res.request.options.headers,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
    };
    return rs;
  }

  protected normalizeRequestShape(res: Response): RequestShape {
    const rs: RequestShape = {
      method: res.request.options.method,
      url: res.url,
      headers: res.request.options.headers,
      body: res.request.options.body?.toString(),
    };
    return rs;
  }
}
