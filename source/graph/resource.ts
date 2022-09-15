import { Node, isNode } from '@autogram/autograph';
import { ResponseShape, HeaderShape } from './index.js';

export class Resource extends Node implements ResponseShape {
  type = 'resource';
  url!: string;
  statusCode?: number;
  statusMessage?: string;

  headers: HeaderShape = {};
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
    this.url = url;
    this.statusCode = statusCode;
    this.statusMessage = statusMessage;
    this.headers = headers;
    this.body = body;
    this.filePath = filePath;
  }
}

Node.types.set('resource', Resource);

export function isResource(input: unknown): input is Resource {
  return isNode(input) && input.type === 'resource';
}
