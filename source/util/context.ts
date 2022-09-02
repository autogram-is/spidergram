import process from 'node:process';
import path from 'node:path';
import { PathLike, Stats, statSync } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';
import is from '@sindresorhus/is';
import mkdirp from 'mkdirp';

export interface ContextHandler {
  directory: string;

  ensureSubdirectory(...subdirectories: string[]): Stats | false;
  fileExists(relativePath: string, subdirectory?: string): Stats | false;
  path(relativePath?: string): string;

  get<T = unknown>(key: string): T;
  set<T = unknown>(key: string, value: T): void;
}

export class DefaultContext {
  static getInstance() {
    if (is.undefined(DefaultContext.instance))
      DefaultContext.instance = new DefaultContext();
    return DefaultContext.instance;
  }

  protected static instance: DefaultContext;

  _directory: string;
  protected values: Record<string, unknown> = {};

  protected constructor() {
    this._directory = process.cwd();
  }

  get directory(): string {
    return this._directory;
  }

  set directory(value: string) {
    this._directory = value;
    this.ensureSubdirectory('./');
  }

  ensureSubdirectory(...subdirectories: string[]): Stats | false {
    const fullPath = path.parse(path.resolve(this.directory, ...subdirectories));
    mkdirp.sync(fullPath.dir);
    return statSync(fullPath.dir) ?? false;
  }

  fileExists(fileName: string, ...subdirectories: string[]): Stats | false {
    const directoryPath = (subdirectories.length > 0)
      ? [this.directory, ...subdirectories].join(path.delimiter)
      : this.directory;
    const fullPath = fileURLToPath(new URL(fileName, directoryPath));
    return statSync(fullPath) ?? false;
  }

  path(relativePath?: string): string {
    if (relativePath) {
      return path.resolve(this._directory, relativePath);
    }
    return path.resolve(this._directory);
  }

  get<T = unknown>(key: string): T {
    return this.values[key] as T;
  }

  set<T = unknown>(key: string, value: T): void {
    this.values[key] = value;
  }
}

export const Context: ContextHandler = DefaultContext.getInstance();
