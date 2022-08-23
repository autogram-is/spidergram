import { Node, Dictionary } from '@autogram/autograph';

export interface HeaderShape extends Dictionary<number | string | string[]> {}

export interface ResponseShape {
  url?: string;
  statusCode?: number;
  statusMessage?: string;
  headers: HeaderShape,
}

export class Status extends Node implements ResponseShape {
  type = 'status';
  headers!: Dictionary<number | string | string[]>;

  constructor(
    public url: string,
    public statusCode: number = -1,
    public statusMessage: string = '',
    headers: HeaderShape,
  ) {
    super('status');
  }
}

Node.types.set('status', Status);
