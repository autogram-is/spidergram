import path from 'node:path';
import { PathLike, Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import is from '@sindresorhus/is';
import mkdirp from 'mkdirp';

export interface ContextHandler {
  directory: string;

  ensureSubdirectory(relativePath: string, create?: boolean): Promise<void>;
  ensureFile(relativePath: string, subdirectory?: string): Promise<Stats>;

  get<T = unknown>(key: string): T;
  set<T = unknown>(key: string, value: T): void;
}

export class DefaultContext {
  protected static instance: DefaultContext;
  protected values: Record<string, unknown> = {};

  static getInstance() {
    if (is.undefined(DefaultContext.instance))
      DefaultContext.instance = new DefaultContext();
    return DefaultContext.instance;
  }

  directory: string;

  protected constructor() {
    this.directory = process.cwd();
  }

  async ensureSubdirectory(relativePath: string, create = true): Promise<void> {
    const fullPath = fileURLToPath(new URL(relativePath, this.directory));
    if (create) {
      await mkdirp(fullPath).catch((error: Error) => {
        throw error;
      });
    }

    return fs.access(fullPath);
  }

  async ensureFile(fileName: string, subdirectory?: string): Promise<Stats> {
    const directoryPath = subdirectory
      ? [this.directory, subdirectory].join(path.delimiter)
      : this.directory;
    const fullPath = fileURLToPath(new URL(fileName, directoryPath));
    return fs.stat(directoryPath);
  }

  get<T = unknown>(key: string): T {
    return this.values[key] as T;
  }

  set<T = unknown>(key: string, value: T): void {
    this.values[key] = value;
  }
}

export const Context: ContextHandler = DefaultContext.getInstance();
