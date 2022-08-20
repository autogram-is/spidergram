import { IncomingHttpHeaders } from 'node:http';
import { Node, Dictionary } from '@autogram/autograph';

export interface ResponseShape {
  url?: string;
  statusCode?: number;
  statusMessage?: string;
  headers: IncomingHttpHeaders;
}

export class Status extends Node implements ResponseShape {
  type = 'status';
  headers!: IncomingHttpHeaders;

  constructor(
    public url: string,
    public statusCode: number = -1,
    public statusMessage: string = '',
    headers: IncomingHttpHeaders = {},
  ) {
    super('status');
  }
}

Node.types.set('status', Status);
