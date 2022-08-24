import { Dictionary } from '../util/index.js';
import { Node } from '@autogram/autograph';
import { ResponseShape, HeaderShape } from './index.js';
import { stat } from 'fs';

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
    this.statusCode = statusCode;
    this.statusMessage = statusMessage;
    this.headers = headers;
    this.body = body;
    this.filePath = filePath;
  }
}

Node.types.set('resource', Resource);
