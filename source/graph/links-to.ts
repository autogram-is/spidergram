import { Node, Edge, Dictionary, Reference } from '@autogram/autograph';

export class LinksTo extends Edge {
  predicate = 'links_to';

  constructor(
    source: Reference<Node>,
    public href: string,
    target: Reference<Node>,
    properties: Dictionary = {},
  ) {
    super(source, 'links_to', target);
  }
}

Edge.types.set('links_to', LinksTo);
