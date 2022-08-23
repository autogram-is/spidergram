import { Merge } from 'type-fest';
import {
  gotScraping,
  Request,
  RequestError,
  PlainResponse,
  OptionsInit,
  Headers,
  got
} from 'got-scraping';
import { FingerprintGenerator, HeaderGeneratorOptions } from 'fingerprint-generator';
import { Entity } from '@autogram/autograph';
import {
  UniqueUrl,
  Resource,
  Status,
  ResponseShape,
  RequestShape,
  RespondsWith,
} from '../graph/index.js';
import { defaultFetcherOptions, Fetcher, FetcherOptions } from './fetcher.js';
import { StreamDownloader } from './stream-downloader.js';
import { HEADER_PRESETS } from './header-presets.js';

type GotFetcherOptions = FetcherOptions & {
  gotConfig: OptionsInit;
}

const defaultGotFetcherOptions: GotFetcherOptions = {
  ...defaultFetcherOptions,
  gotConfig: {
    throwHttpErrors: false,
    followRedirect: true,
    headerGenerator: new FingerprintGenerator(),
    headerGeneratorOptions: HEADER_PRESETS.MODERN_DESKTOP,
  } as OptionsInit
}

export class GotFetcher extends Fetcher {
  gotConfig: OptionsInit;

  constructor(
    customOptions: Partial<GotFetcherOptions> = {},
  ) {
    super();
    const options: GotFetcherOptions = {
      ...defaultGotFetcherOptions,
      ...customOptions
    };

    this.gotConfig = {
      throwHttpErrors: false,
      followRedirect: true,
      headerGenerator: new FingerprintGenerator(),
      headerGeneratorOptions: HEADER_PRESETS.MODERN_DESKTOP,
      ...options,
    };
    if (this.gotConfig.headers === undefined) {
      this.gotConfig.headers = options.headers;
    } else {
      this.gotConfig.headers = {
        ...this.gotConfig.headers,
        ...options.headers
      }
    }
  }

  async check(url: UniqueUrl): Promise<Entity[]> {
    return new Promise<Entity[]>((resolve, reject) => {

      const requestOptions: OptionsInit = {
        url: url.url,
        headers: {
          referer: url.referer,
        },
        ...this.gotConfig,
      }

      try {
        gotScraping.head(requestOptions)
          .then((r:Response) => {
            resolve(this.statusFromResponse(url, r.request.options, r))
            const s = new Status(r.url, r.statusCode, r.statusMessage, r.headers);
            const rw = new RespondsWith(url, s, r.request.options);
            resolve([s, rw]);
          });
      } catch (error: unknown) {
        if (error instanceof RequestError) {
          const s = new Status(url.url, -1, error.message);
          const rw = new RespondsWith(url, s, error.request?.options);
          resolve([s, rw]);
        } else {
          reject(error);
        }
      }
    });
  }

  async fetch(url: UniqueUrl): Promise<Entity[]> {
    let stream: Request;
    let result: Promise<Entity[]>;

    const requestOptions: OptionsInit = {
      url: url.url,
      headers: {
        referer: url.referer,
      },
      ...this.gotConfig,
    }

    return new Promise<Entity[]>((resolve, reject) => {
      try {
        const stream = gotScraping.stream(requestOptions)
          .on('downloadProgress', (p) => this.emit('downloadProgress', p))
          .once('response', async (response: PlainResponse) => {
            const requestOptions = stream.response!.request.options;
            if (this.should.discard(response)) {
              await this.statusFromResponse(url, requestOptions, response).then(
                (result: Entity[]) => {
                  this.emit('discard', url.url);
                  resolve(result);
                },
              );
            } else if (this.should.store(response)) {
              await this.resourceFromBodyResponse(
                url,
                requestOptions,
                response,
                stream,
              ).then((result: Entity[]) => {
                this.emit('retrieve', url.url);
                resolve(result);
              });
            } else if (this.should.download(response)) {
              await this.resourceFromDownload(
                url,
                requestOptions,
                response,
                stream,
                this.downloadPath,
              ).then((result: Entity[]) => {
                this.emit('download', url.url);
                resolve(result);
              });
            }
          })
          .once('error', async (error: Error) => {
            await this.statusFromError(url, error).then((result: Entity[]) => {
              this.emit('retry', url.url);
              resolve(result);
            });
          })
          .on('retry', async (retryCount: number, error: RequestError) => {
            await this.statusFromError(url, error).then((result: Entity[]) => {
              this.emit('retry', url.url);
              resolve(result);
            });
          });
      } catch (error: unknown) {
        if (error instanceof RequestError) {
          result = this.statusFromError(url, error);
          this.emit('error', url.url, error);
          resolve(result);
        } else {
          reject(error);
        }
      }
    }).finally(() => {
      if (stream !== undefined) stream.destroy();
    });
  }

  protected async statusFromError(
    url: UniqueUrl,
    error: Error,
    request?: RequestShape,
  ): Promise<Entity[]> {
    return new Promise((resolve, reject) => {
      const s = new Status(url.url, -1, error.name + ': ' + error.message);
      const rw = new RespondsWith(url, s, request);
      resolve([s, rw]);
    });
  }

  protected async statusFromResponse(
    url: UniqueUrl,
    request: RequestShape,
    resp: ResponseShape,
  ): Promise<Entity[]> {
    return new Promise((resolve, reject) => {
      const s = new Status(
        resp.url ?? url.url,
        resp.statusCode,
        resp.statusMessage,
        resp.headers,
      );
      resolve([s, new RespondsWith(url, s, request)]);
    });
  }

  protected async resourceFromBodyResponse(
    url: UniqueUrl,
    request: RequestShape,
    resp: ResponseShape,
    stream: Request,
  ): Promise<Entity[]> {
    return new Promise((resolve, reject) => {
      StreamDownloader.stringify(stream).then(
        (body: string) => {
          const r = new Resource(
            resp.url ?? url.url,
            resp.statusCode,
            resp.statusMessage,
            resp.headers,
            body,
          );
          resolve([r, new RespondsWith(url, r, request)]);
        },
        async (error: any) => {
          const result = await this.statusFromError(url, error);
          stream.destroy();
          resolve(result);
        },
      );
    });
  }

  protected async resourceFromDownload(
    url: UniqueUrl,
    request: RequestShape,
    resp: ResponseShape,
    stream: Request,
    directory: string,
  ): Promise<Entity[]> {
    const resource = new Resource(
      resp.url!,
      resp.statusCode,
      resp.statusMessage,
      resp.headers,
    );

    const fullPath = [
      directory,
      resource.id,
      StreamDownloader.getFileName(resp.headers, url.parsed),
    ];

    mkdirp(fullPath.slice(0, -1).join('/'));

    return new Promise((resolve) => {
      StreamDownloader.download(stream, fullPath.join('/'))
        .then((value: string) => {
          resource.filePath = value;
          resolve([resource, new RespondsWith(url, resource, request)]);
        })
        .catch((error: unknown) => {
          throw error;
        });
    });
  }
}
