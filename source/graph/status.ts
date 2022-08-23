import { Dictionary } from '../util/index.js';
import { Node } from '@autogram/autograph';
import { HeaderShape, ResponseShape } from './index.js';

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
