import { Node, Dictionary } from '@autogram/autograph';

export interface ResponseShape {
  url?: string;
  statusCode?: number;
  statusMessage?: string;
  headers: Dictionary<number | string | string[]>,
}

export class Status extends Node implements ResponseShape {
  type = 'status';
  headers!: Dictionary<number | string | string[]>;

  constructor(
    public url: string,
    public statusCode: number = -1,
    public statusMessage: string = '',
    headers: Dictionary<string | string[]> = {},
  ) {
    super('status');
  }
}

Node.types.set('status', Status);
