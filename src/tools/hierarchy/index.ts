/**
 * Tools for building and working with parent/child hierarchies
 *
 * @remarks
 * Spidergram's hierachy tools are all designed around a core scenario: you have
 * a flat list of data objects, and you want to turn 'em into a tree. They have
 * _some sort_ of implicit parent/child relationship that can either be
 * extrapolated from their explicit data, created using an algorithm of your
 * devising, or injected using a second pile of data. Some examples include:
 *
 * - Raw URLs (path structure is an inherent hierarchy)
 * - Page Resources with Schema.org 'breadcrumb' metadata
 * - Page Resources with metadata, and a hand-crafted hierarchy with metadata
 *   based rules
 *
 * Each different HierarchyBuilder is meant to handle a specific scenario like the
 * ones above; all of them descend from the core {@link HierarchyBuilder} class,
 * and thus share some basic structure:
 *
 * - A HierarchyBuilder implementation is responsible for turning UserData records
 *   into HierarchyItems, implementing the algorithm that matches HierarchyItems
 *   with their relatives, and holding onto the complete list of all HierarchyItems,
 *   even if they're orphaned.
 * - A HierarchyItem implementation is responsible for holding its own unique ID,
 *   holding references to its parents and children if they exist, and providing
 *   helper functions for navigating the tree it belongs to.
 *
 * @example
 * ```
 * const builder = new SomeHierarchyBuilder<MyDataType>();
 * builder.add(myData);
 * builder.populateRelationships();
 * const firstRoot = builder.findRoots().pop();
 * const orphans = builder.findOrphans();
 * ```
 */

export * from './hierarchy-builder.js';
export * from './hierarchy-item.js';
export * from './url-hierarchy-builder.js';
export * from './render.js';
