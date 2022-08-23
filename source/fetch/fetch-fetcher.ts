import fetch, { Request,  Response, Headers } from 'cross-fetch';
import { FingerprintGenerator } from 'fingerprint-generator';
import { Fetcher } from './fetcher.js';
import { Entity, UniqueUrl, HeaderShape, RequestShape, ResponseShape } from '../graph/index.js';
import { ResponseFilters } from './index.js';
import { Dictionary } from '../util/index.js';

export class FetchFetcher extends Fetcher {
  async fetch(url: UniqueUrl): Promise<Entity[]> {
    const results: Entity[] = [];
    const req = this.buildRequest(url, 'get');
    const resp = await this.makeRequest(req);
  }

  async check(url: UniqueUrl): Promise<Entity[]> {
    const results: Entity[] = [];
    const req = this.buildRequest(url, 'head');
    const resp = await this.makeRequest(req);
  }

  private buildRequest(url: UniqueUrl, method: string): Request {
    const generator = new FingerprintGenerator(this.browserPreset);
    return new Request(url.url, { method: method, headers: generator.getHeaders() });
  };

  private async makeRequest(req: RequestInfo): Promise<Response> {
    return new Promise((resolve, reject) => {
      const request = new Request(req);
      fetch(request)
        .then((resp: Response) => resolve(resp))
        .catch((reason: unknown) => reject(reason));
    });
  }

  private makeResponseShape(r: Response): ResponseShape {
    const headers: HeaderShape = {};
    r.headers.forEach((value, key) => {
      headers[key] = value;
    })
    const result: ResponseShape = {
      url: r.url,
      statusCode: r.status,
      statusMessage: r.statusText,
      headers: headers,
    };
    return result;
  }

  private makeRequestShape(r: Request): RequestShape {
    const headers: HeaderShape = {};
    r.headers.forEach((value, key) => {
      headers[key] = value;
    })
    const result: RequestShape = {
      method: r.method,
      url: r.url,
      headers: headers,
    };
    return result;
  }
}