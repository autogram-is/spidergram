import { ParsedUrl, NormalizedUrl } from "@autogram/url-tools";
import {
  HierarchyBuilder,
  HierarchyItem,
  HierarchyOptions,
  GapStrategy
} from "./hierarchy.ts";

export class UrlHierarchy extends HierarchyBuilder {
  pool?: unknown[] | undefined;
  roots: HierarchyItem<unknown, Record<string, unknown>>[];
  orphans: HierarchyItem<unknown, Record<string, unknown>>[];
  addItems(items: unknown[]): HierarchyItem<unknown, Record<string, unknown>>[] {
    throw new Error("Method not implemented.");
  }
  buildTree(relationships: HierarchyItem<unknown, Record<string, unknown>>[]): boolean {
    throw new Error("Method not implemented.");
  }

  constructor() {
    super();
    this.pool = [];
    this.roots = [];
    this.orphans = [];
  }
}