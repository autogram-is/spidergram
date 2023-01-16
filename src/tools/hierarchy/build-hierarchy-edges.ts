import { Constructor } from "crawlee";
import { Edge, Vertice } from "../../index.js";
import { HierarchyItem } from "./index.js";

/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Accept a list of HierarchyItems and product a list of persistable Edges
 */
export function buildHierarchyEdges<V extends Vertice = Vertice, E extends Edge = Edge>(
  items: HierarchyItem<V>[],
  data: Record<string, unknown> = {},
  edgeConstructor: Constructor<E>
): E[] {

  const results: E[] = [];

  for (const item of items) {
    const { item: to, parent: from, inferred, id, ...edgeProperties } = item;
    results.push(new edgeConstructor({
      to,
      from,
      label: inferred ? 'inferred' : undefined,
      ...edgeProperties,
      ...data
    }));
  }
  return results;
}
/* eslint-enable no-unused-vars */
