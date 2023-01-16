/**
 * How an item should be treated when a distant ancestor, but no direct
 * parent, can be found in the pool of items.
 * 
 * @remark
 * These strategies make sense for data like URLs, where a full path is
 * present in an item's data. It may not be possible to apply them with
 * other hierarchy-building mechanisms; DISCARD and SEPARATE are the
 * best fallbacks in those situations.
 */
export const enum GapStrategy {
  /**
   * Treat the item as a direct child of its closest ancestor.
   */
  ADOPT = 'adopt',

  /**
   * Create intermediary parents linking the item to its closest ancestor.
   */
  BRIDGE = 'bridge',

  /**
   * Discard the item (and its children, if they exist).
   */
  PRUNE = 'prune',

  /**
   * Treat the item (and its own children, if they exist) as a separate hierarchy.
   */
  SEPARATE = 'separate',
}

/**
 * Options and flags to control how a pool of objects should be transformed
 * into a hierarchy.
 */
export interface HierarchyOptions<T = unknown> {
  /**
   * How an item should be treated when a distant ancestor, but no direct
   * parent, can be found in the pool of items.
   * 
   * @defaultValue `GapStrategy.ADOPT`
   */
  gaps?: GapStrategy,

  /**
   * If multiple roots nodes are found, create a new parent to consolidate them.
   * 
   * @defaultValue `true`
   */
  forceSingleRoot?: boolean,

  /**
   * A pointer to the unique identifier for each item; this should be the name
   * of a property on the item, a dot-notation path to a property, or a function
   * that will return a unique ID for the item as a string.
   */
  id?: string | ((input: T) => string),
}

export type HierarchyItem<T = unknown, UserData = Record<string, unknown>> = UserData & {
  id: string,
  inferred: boolean,
  item?: T,
  parent?: T
}
