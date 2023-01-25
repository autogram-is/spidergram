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
   * - default: Only display the first 10 items from each directory; summarize the rest.
   * - expand: Display the full tree, sorted alphabetically, with no limits
   * - collapse: Hide and summarize leaf nodes, displaying only branches
   * - plain: Expand and display all items with minimal formatting; indent using tabs rather than ASCII tree art.
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
   * Formats the name of a hierarchy item when displayed in the tree
   */
  label?: (item: T, options: RenderOptions<T>, depth: number) => string,

  /**
   * Formats the short summary of a collapsed branch's children
   */
  summary?: (items: T, options: RenderOptions<T>, depth: number) => string,

  /**
   * Formats a summary of truncated children when maxChildren is readched
   */
  truncated?: (items: T[], options: RenderOptions<T>, depth: number) => string,

  /**
   * Whether a branch should be collapsed or expanded. By default, this is TRUE when
   * depth >= options.maxDepth.
   */
  collapse?: (item: T, options: RenderOptions<T>, depth: number) => boolean

  /**
   * Optional predicate function to conditionally filter the displayed children of an item.
   * Can be used to alter the sorting order of child items, hide leaf nodes but display
   * branches, etc.
   */
  visibleChildren?: (item: T, options: RenderOptions<T>, depth: number) => T[],

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
    maxDepth: 5,
    maxChildren: 10,
    characters: defaultChars,
    collapse: (item, options, depth) =>  {
      if (depth >= (options.maxDepth ?? Infinity)) return true;
      if (options.maxChildren === 0) return true;
      return false;
    },
    visibleChildren: (item) => item.children.sort((a, b) => a.name.localeCompare(b.name)),
    summary: (item, options) => {
      const children = item.children.length;
      if (children === 0 || children <= (options.maxChildren ?? Infinity)) return '';
      let output = `${item.children.length} ${pluralize(item.children, 'child', 'children')}`;
      const descendants = item.descendants.length;
      if (descendants > children) output += `, ${descendants.toLocaleString()} descendants`;
      return (` (${output})`);
    },
    truncated: (items) => {
      const descendants = items.map(item => item.descendants).flat().length;
      return (`…${items.length} additional ${pluralize(items.length, 'child', 'children')}`) + (descendants ? ` with ${descendants} ${pluralize(descendants, 'descendant', 'descendant')}` : '');
    }
  },
  expand: {
    maxDepth: Infinity,
    maxChildren: Infinity,
    collapse: () => false
  },
  collapse: {
    summary: (item) => {
      const leaves = item.children.filter(item => item.isLeaf).length;
      if (leaves === 0) return '';
      let output = `${leaves.toLocaleString()} hidden ${pluralize(leaves, 'child', 'children')}`;
      if (item.isRoot) {
        const descendants = item.descendants.length;
        if (descendants > item.children.length) output += `${descendants.toLocaleString()} total descendants`;
      }
      return (` (${output})`);
    },
    collapse: () => false,
    visibleChildren: item => item.children.filter(child => !child.isLeaf)
  },
  plain: {
    collapse: () => false,
    visibleChildren: item => item.children,
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
  const label = prefix<T>(depth, last, options) + getLabel(item, options, depth) + getSummary(item, options, depth);
  const lines = [label];

  if (!shouldCollapse(item, options, depth)) {
    const maxChildren = options.maxChildren ?? Infinity;
    const visibleChildren = getChildren(item, options, depth);
    do {
      if (lines.length > maxChildren) {
        if (visibleChildren.length === 1) {
          lines.push(prefix<T>(depth + 1, true, options) + getLabel(visibleChildren[0], options, depth) + getSummary(visibleChildren[0], options, depth));
        } else {
          lines.push(prefix<T>(depth + 1, true, options) + getTruncated(visibleChildren, options, depth));
        }
        break;
      }
      const child = visibleChildren.shift();
      if (child) {
        const isLastChild = visibleChildren.length === 0;
        lines.push(renderItem(child, options, depth + 1, isLastChild));
      }
    } while (visibleChildren.length > 0);
  }
  
  return lines.join('\n');
}

function getLabel<T extends HierarchyItem>(item: T, options: RenderOptions<T> = {}, depth = 0): string {
  return (options.label ? options.label(item, options, depth) : item.name);
}

function shouldCollapse<T extends HierarchyItem>(item: T, options: RenderOptions<T> = {}, depth = 0) {
  return (options.collapse ? options.collapse(item, options, depth) : false);
}

function getSummary<T extends HierarchyItem>(item: T, options: RenderOptions<T> = {}, depth = 0): string {
  return options.summary ? options.summary(item, options, depth) : ` (${item.children.length} children)`;
}

function getTruncated<T extends HierarchyItem>(items: T[], options: RenderOptions<T> = {}, depth = 0): string {
  return options.truncated ? options.truncated(items, options, depth) : ` additional (${items.length} children)`;
}

function getChildren<T extends HierarchyItem>(item: T, options: RenderOptions<T> = {}, depth = 0) {
  return options.visibleChildren ? options.visibleChildren(item, options, depth) : item.children;
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

function pluralize(input: number | unknown[], singular: string, plural: string) {
  const count = Array.isArray(input) ? input.length : input; 
  return (count === 1) ? singular : plural;
}