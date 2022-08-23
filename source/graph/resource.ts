import { IncomingHttpHeaders } from 'node:http';
import { Node, Dictionary } from '@autogram/autograph';
import { ResponseShape, HeaderShape } from './status.js';

export class Resource extends Node implements ResponseShape {
  type = 'resource';
  url!: string;
  statusCode!: number;
  statusMessage!: string;
  headers!: HeaderShape;
  body?: string;
  filePath?: string;

  constructor(
    url: string,
    statusCode?: number,
    statusMessage?: string,
    headers: HeaderShape = {},
    body = '',
    filePath = '',
  ) {
    super('resource');
    const data: Dictionary = {
      url,
      statusCode,
      statusMessage,
      headers,
      body,
      filePath,
    };
  }
}

Node.types.set('resource', Resource);
