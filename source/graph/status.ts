import { Node } from '@autogram/autograph';
import { Dictionary } from '../util/index.js';
import { HeaderShape, ResponseShape } from './index.js';

export class Status extends Node implements ResponseShape {
  type = 'status';

  constructor(
    public url: string,
    public statusCode: number = -1,
    public statusMessage: string = '',
    public headers: HeaderShape = {},
  ) {
    super('status');
  }
}

Node.types.set('status', Status);
