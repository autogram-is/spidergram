import { Node, Edge, isEdge, Dictionary, Reference } from '@autogram/autograph';

export class LinksTo extends Edge {
  predicate = 'links_to';
  href!: string;
  context?: string;

  constructor(
    source: Reference<Node>,
    target: Reference<Node>,
    properties: Dictionary = {},
  ) {
    super(source, 'links_to', target);
    for (const key in properties) {
      this[key] = properties[key];
    }
  }
}

Edge.types.set('links_to', LinksTo);

export function isLinksTo(input: unknown): input is LinksTo {
  return isEdge(input) && input.predicate === 'links_to';
}
