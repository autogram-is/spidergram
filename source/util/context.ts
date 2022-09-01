import path from 'node:path'
import { PathLike, Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import is from '@sindresorhus/is';
import mkdirp from 'mkdirp';

export interface ContextHandler {
  directory: string;

  ensureSubdirectory(relativePath: string, create: boolean): Promise<void>;
  ensureFile(relativePath: string, subdirectory?: string): Promise<Stats>;

  get<T = unknown>(key: string): T;
  set<T = unknown>(key: string, value: T): void;
}

export class DefaultContext {
  protected static instance: DefaultContext;

  protected values: Record<string, unknown> = {};
  directory: string;

  protected constructor() {
    this.directory = fileURLToPath(new URL('./', import.meta.url));
  }

  async ensureSubdirectory(relativePath: string, create: boolean): Promise<void> {
    const fullPath = fileURLToPath(new URL(relativePath, this.directory));
    return fs.access(fullPath)
      .catch((reason: unknown) => {
        if (create) {
          mkdirp.sync(fullPath);
        } else {
          Promise.reject(reason);
        }
      });
  }

  async ensureFile(fileName: string, subdirectory?: string): Promise<Stats> {
    const directoryPath = (subdirectory)
      ? [this.directory, subdirectory].join(path.delimiter)
      : this.directory;
    const fullPath = fileURLToPath(new URL(fileName, directoryPath));
    return fs.stat(directoryPath)
  }

  static getInstance() {
    if (is.undefined(DefaultContext.instance)) DefaultContext.instance = new DefaultContext();
    return DefaultContext.instance;
  }

  get<T = unknown>(key: string): T {
    return this.values[key] as T;
  }

  set<T = unknown>(key: string, value: T): void {
    this.values[key] = value;
  }
}

export const Context: ContextHandler = DefaultContext.getInstance();
