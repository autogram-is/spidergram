import { HierarchyItem } from './index.js';
import _ from 'lodash';

/**
 * Options to control how trees are rendered to text
 */
export interface RenderOptions<T extends HierarchyItem = HierarchyItem> {
  [key: string]: unknown;

  /**
   * The name of a rendering preset to use; built-in options include:
   * 
   * - default: Render the full tree, sorted alphabetically, with no limits
   * - branches: Hide and summarize leaf nodes, rendering only branches
   * - plain: Expand and display all options with minimal formatting;
   *     indent using tabs rather than ASCII tree art.
   *
   * Additional option flags and values will override the preset defaults.
   * 
   * @type {?Extract<keyof typeof presets, string>}
   */
  preset?: Extract<keyof typeof presets, string>;

  /**
   * Maximum tree depth to display
   *  
   * @defaultValue `Infinity`
   */
  maxDepth?: number,

  /**
   * Maximum number of children to display for each item
   *  
   * @defaultValue `Infinity`
   */
  maxChildren?: number,

  /**
   * Optional formatting function to control how the name of a hierarchy item is
   * displayed in the tree; defaults to the item's ID property.
   */
  name?: (item: T, options: RenderOptions<T>, depth: number) => string,

  /**
   * Optional formatting function to control how truncated lists or collapsed branch
   * items are displayed.
   */
  summary?: (items: T[], inline: boolean, options: RenderOptions<T>, depth: number) => string,

  /**
   * Optional predicate function to conditionally collapse branches. Can be used to
   * expand or collapse individual branches of trees; useful when displaying extremely
   * large trees.
   */
  collapse?: (item: T, options: RenderOptions<T>, depth: number) => boolean

  /**
   * Optional predicate function to conditionally filter the displayed children of an item.
   * Can be used to alter the sorting order of child items, hide leaf nodes but display
   * branches, etc.
   */
  children?: (item: T, options: RenderOptions<T>, depth: number) => T[],

  characters?: {
    root: string,
    parent: string,
    item: string;
    itemLast: string,
    parentLast: string,
  }
}

const defaultChars = {
  root:       '',
  parent:     ' │  ',
  item:       ' ├─ ',
  itemLast:   ' ╰─ ',
  parentLast: '    ',
}

const presets: Record<string, RenderOptions<HierarchyItem>> = {
  default: {
    maxDepth: Infinity,
    maxChildren: Infinity,
    characters: defaultChars,
    collapse: (item, options, depth) =>  {
      if (depth >= (options.maxDepth ?? Infinity)) {
        return true;
      } else if (options.maxChildren === 0) {
        return true;
      }
      return false;
    },
    children: (item) => item.children.sort((a, b) => a.name.localeCompare(b.name)),
    summary: (items, inline) => {
      if (items.length === 0) {
        return '';
      } else if (inline) {
        return ' (' + items.flatMap(child => child.flattened).length.toString() + ' descendants)';
      } else {
        const descendants = items.map(item => item.descendants).flat().length;
        return (`…${items.length} additional children`) + (descendants ? ` with ${descendants} descendants` : '');
      }
    }
  },
  branches: {
    name: item => {
      const leaves = item.children.filter(child => child.isLeaf).length;
      let name = item.name;
      if (leaves) {
        name += ` (${leaves} ${ leaves > 1 ? 'children' : 'child'})`
      }
      return name;
    },
    collapse: () => false,
    children: item => item.children.filter(child => !child.isLeaf)
  },
  plain: {
    collapse: () => false,
    children: item => item.children,
    characters: {
      root:       '',
      parent:     '\t',
      item:       '\t',
      itemLast:   '\t',
      parentLast: '\t',    
    }
  }
};

const defaults: RenderOptions<HierarchyItem> = presets.default;

export function render<T extends HierarchyItem>(item: T, customOptions: RenderOptions<T> = { }): string {
  const preset = customOptions.preset ? presets[customOptions.preset] ?? {} : {};
  const options: RenderOptions<T> = _.defaultsDeep(customOptions, preset, defaults);
  return renderItem(item, options);
}

function renderItem<T extends HierarchyItem>(item: T, options: RenderOptions<T>, depth = 0, last = false): string {
  const maxChildren = options.maxChildren ?? Infinity;

  if (shouldCollapse(item, options, depth)) {
    return prefix<T>(depth, last, options) + formatName(item, options, depth) + getSummary(item.children, false, options);
  }
  
  const children = getChildren(item, options, depth);
  const lines = [prefix<T>(depth, last, options) + formatName(item, options, depth)];

  do {
    if (lines.length > maxChildren) {
      if (children.length === 1) {
        lines.push(prefix<T>(depth + 1, true, options) + formatName(children[0], options, depth) + getSummary(children[0].children, true, options));
      } else {
        lines.push(prefix<T>(depth + 1, true, options) + getSummary(children, false, options));
      }
      break;
    }
    const child = children.shift();
    if (child) {
      const isLastChild = children.length === 0;
      lines.push(renderItem(child, options, depth + 1, isLastChild));
    }
  } while (children.length > 0);
  
  return lines.join('\n');
}

function shouldCollapse<T extends HierarchyItem>(item: T, options: RenderOptions<T> = {}, depth = 0) {
  return (options.collapse ? options.collapse(item, options, depth) : false);
}

function formatName<T extends HierarchyItem>(item: T, options: RenderOptions<T> = {}, depth = 0): string {
  return (options.name ? options.name(item, options, depth) : item.name);
}

function getSummary<T extends HierarchyItem>(items: T[], inline: boolean, options: RenderOptions<T> = {}, depth = 0): string {
  return options.summary ? options.summary(items, inline, options, depth) : ` (${items.length} children)`;
}

function getChildren<T extends HierarchyItem>(item: T, options: RenderOptions<T> = {}, depth = 0) {
  return options.children ? options.children(item, options, depth) : item.children;
}

let prefixes: string[] = [];

function prefix<T extends HierarchyItem>(depth = 0, last = false, options: RenderOptions<T>) {
  const { root, parent, item, itemLast, parentLast } = options.characters ?? defaultChars;

  if (depth === 0) {
    prefixes = [];
    return root;
  }

  let currentPrefix = item;
  if (last) {
    currentPrefix = itemLast;
  }

  if (depth === prefixes.length + 1) {
    const previous = prefixes[prefixes.length - 1];
    if (previous === itemLast) prefixes[prefixes.length - 1] = parentLast;
    if (previous === item) prefixes[prefixes.length - 1] = parent;
    prefixes.push(currentPrefix);
  } else if (depth === prefixes.length) {
    prefixes[prefixes.length - 1] = currentPrefix;
  } else if (depth < prefixes.length) {
    prefixes.splice(depth);
    prefixes[prefixes.length - 1] = currentPrefix;
  }

  return prefixes.join('');
}
