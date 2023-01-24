import { HierarchyItem } from './index.js';
import _ from 'lodash';

/**
 * Options to control how trees are rendered to text
 */
export interface RenderOptions {
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
   * Optional predicate function to filter hierarchy items before they're displayed.
   */
  filter?: (item: HierarchyItem) => boolean,

  /**
   * Optional formatting function to control how the name of a hierarchy item is
   * displayed in the tree; defaults to the item's ID property.
   */
  name?: (item: HierarchyItem) => string,

  prefix?: string,
}

const presets: Record<string, RenderOptions> = {
  default: {}
};

const defaults: RenderOptions = {
  maxDepth: 1,
  maxChildren: 20,
  prefix: '  ',
};

type RenderPreset = Extract<keyof typeof presets, string>

export function render(item: HierarchyItem, customOptions: RenderPreset | RenderOptions = 'default'): string {
  let options: RenderOptions = {};
  if (typeof customOptions === 'string') {
    options = _.defaultsDeep(presets[customOptions], defaults);
  } else {
    options = _.defaultsDeep(customOptions, defaults);
  }
  return formatItem(item, options);
}

function formatItem(item: HierarchyItem, options: RenderOptions, depth = 0): string {
  const maxDepth = options.maxDepth ?? Infinity;
  const maxChildren = options.maxChildren ?? Infinity;

  if (item.children.length === 0) return format(item, options, depth);
  if (depth >= maxDepth) {
    return `${format(item, options, depth)} (${item.descendants.length} descendants)`;
  }

  const children = item.children.sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];
  const displayChildren = children.slice(0, maxChildren - 1);
  const summarizedChildren = children.slice(maxChildren - 1, -1);

  lines.push(format(item, options, depth));
  for (const child of displayChildren) {
    lines.push(formatItem(child, options, depth + 1));
  }
  if (summarizedChildren.length > 0) {
    const descendants = summarizedChildren.map(item => item.descendants).flat().length;
    let summary = prefix(options, depth + 1);
    summary += `…${summarizedChildren.length} additional children`;
    if (descendants > 0) summary += `, with ${descendants} descendants`;
    lines.push(summary);
  }
  return lines.join(`\n`);
}

function format(item: HierarchyItem, options: RenderOptions, depth = 0): string {
  return prefix(options, depth) + (options.name ? options.name(item) : item.name);
}

function prefix(options: RenderOptions, depth = 0) {
  return (options.prefix ?? '  ').repeat(depth);
}
