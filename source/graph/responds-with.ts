import { Reference, Edge, Dictionary } from '@autogram/autograph';
import { UniqueUrl, Resource, Status } from './index.js';

export interface RequestShape {
  method?: string;
  url?: string | URL;
  headers: Dictionary<number | string | string[]>;
}
export class RespondsWith extends Edge implements RequestShape {
  predicate = 'responds_with';
  method: string;
  url: string | URL;
  headers: Dictionary<number | string | string[]>;

  constructor(
    uniqueUrl: Reference<UniqueUrl>,
    response: Reference<Resource | Status>,
    request?: RequestShape,
    extra: Dictionary = {},
  ) {
    super(uniqueUrl, 'responds_with', response);
    this.method = request?.method ?? '';
    this.url = request?.url?.toString() ?? '';
    this.headers = request?.headers ?? {};
  }
}

Edge.types.set('responds_with', RespondsWith);
