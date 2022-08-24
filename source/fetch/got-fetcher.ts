import is from '@sindresorhus/is';
import { gotScraping, Progress, Response, RequestError } from "got-scraping";
import { Fetcher, StreamDownloader, ResponseFilters } from "../fetch/index.js";
import { Entity, UniqueUrl, RequestShape, ResponseShape, Status, Resource, RespondsWith } from '../graph/index.js';

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
          this.emit('status', uu, res.statusCode);
          resolve(this.statusFromResponse(uu, res));
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
      gotScraping.stream(uu.url, requestOptions)
        .once('response', (stream: Response) => {
          const resp = this.normalizeResponseShape(stream);
          const req = this.normalizeRequestShape(stream);

          if (this.rules.discard(resp) || ResponseFilters.isError(resp)) {
            stream.destroy();
            resolve(this.statusFromResponse(uu, stream));
          } else if (this.rules.download(resp)) {
            this.resourceFromDownload(uu, stream)
              .then((entities: Entity[]) => {
                stream.destroy();
                resolve(entities);
              });
            console.log('downloading');
          } else if (this.rules.store(resp)) {
            this.resourceFromBody(uu, stream)
            .then((entities: Entity[]) => {
              stream.destroy();
              resolve(entities);
            });
          }
        })
        .on('downloadProgress', (progress: Progress) => {
          this.emit('downloadProgress', uu, progress);
        })
        .once('error', (err: Error) => {
          if (err instanceof RequestError) {
            resolve(this.statusFromError(uu, err));
          }
          else reject(err);
        });
    });
  }

  protected async resourceFromBody(uu: UniqueUrl, stream: Response): Promise<Entity[]> {
    return new Promise((resolve, reject) => {
      StreamDownloader.stringify(stream).then(
        (body: string) => {
          const resource = new Resource(
            stream.url,
            stream.statusCode,
            stream.statusMessage,
            stream.headers,
            body,
          );
          const rw = new RespondsWith(uu, resource, this.normalizeRequestShape(stream));
          resolve([resource, rw]);
        })
        .catch((error: unknown) => {
          reject(error);
        })
        .finally(() => {
          stream.destroy();
        })
      });
  }

  protected async resourceFromDownload(uu: UniqueUrl, stream: Response): Promise<Entity[]> {
    const resource = new Resource(stream.url, stream.statusCode, stream.statusMessage, stream.headers);
    const dir = [this.filePath, 'download', resource.id].join('/');

    return new Promise((resolve, reject) => {
      StreamDownloader.download(stream, dir)
        .then((value: string) => {
          resource.filePath = value;
          const rw = new RespondsWith(uu, resource, this.normalizeRequestShape(stream));
          resolve([resource, rw]);
        })
        .catch((error: unknown) => {
          reject(error);
        })
        .finally(() => {
          stream.destroy();
        })
      });
  }

  protected statusFromResponse(uu: UniqueUrl, res: Response): Entity[] {
    const req = this.normalizeRequestShape(res);
    const s = new Status(res.url, res.statusCode, res.statusMessage, res.headers);
    const rw = new RespondsWith(uu, s, req);
    return [s, rw];
  }

  protected statusFromError(uu: UniqueUrl, err: RequestError): Entity[] {
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