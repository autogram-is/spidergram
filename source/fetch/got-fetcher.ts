import * as fs from 'node:fs/promises';
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
import { FileManager, Context } from '../util/index.js';

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
    return gotScraping(uu.url, requestOptions)
      .then((response: Response) => {
        const shape = this.normalizeResponseShape(response);
        if (this.rules.discard(shape)) {
          this.emit('skip', uu);
          return [uu];
        } else if (this.rules.download(shape)) {
          this.emit('fetch', uu);
          return this.downloadedResource(uu, response);
        } else if (this.rules.store(shape)) {
          this.emit('fetch', uu);
          return this.savedResource(uu, response);
        } else {
          this.emit('status', uu);
          return this.responseStatus(uu, response);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof RequestError) {
          this.emit('fail', error, uu);
          return this.errorStatus(uu, error);
        } else {
          throw error;
        }
      });
  }

  protected async downloadedResource(
    uu: UniqueUrl,
    response: Response,
  ): Promise<Entity[]> {
    const request = this.normalizeRequestShape(response);
    const resource = new Resource(
      response.url,
      response.statusCode,
      response.statusMessage,
      response.headers,
    );
    const rw = new RespondsWith(uu, resource, request);
    const directory = [Context.directory, 'downloads', resource.id].join('/');
    Context.ensureSubdirectory(directory);
    const fileName = FileManager.filenameFromHeaders(
      response.headers,
      uu.parsed!,
    );
    const filePath = [directory, fileName].join('/');

    return fs.writeFile(filePath, response.rawBody).then(() => {
      resource.filePath = filePath;
      return [resource, rw];
    });
  }

  protected async savedResource(
    uu: UniqueUrl,
    response: Response,
  ): Promise<Entity[]> {
    return new Promise((resolve) => {
      const request = this.normalizeRequestShape(response);
      const resource = new Resource(
        response.url,
        response.statusCode,
        response.statusMessage,
        response.headers,
        response.rawBody.toString(),
      );
      const rw = new RespondsWith(uu, resource, request);
      resolve([resource, rw]);
    });
  }

  protected responseStatus(uu: UniqueUrl, response: Response): Entity[] {
    const request = this.normalizeRequestShape(response);
    const s = new Status(
      response.url,
      response.statusCode,
      response.statusMessage,
      response.headers,
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

  protected normalizeResponseShape(response: Response): ResponseShape {
    const rs: ResponseShape = {
      url: response.url,
      headers: response.headers,
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
    };
    return rs;
  }

  protected normalizeRequestShape(response: Response): RequestShape {
    const rs: RequestShape = {
      method: response.request.options.method,
      url: response.url,
      headers: response.request.options.headers,
      body: response.request.options.body?.toString(),
    };
    return rs;
  }
}
