import process from 'node:process';
import path from 'node:path';
import { PathLike, Stats, statSync } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';
import is from '@sindresorhus/is';
import mkdirp from 'mkdirp';

export interface ContextHandler {
  directory: string;

  ensureSubdirectory(path?: string, create?: boolean): Stats | false;
  fileExists(path: string): Stats | false;
  path(path?: string): string;

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
    this.ensureSubdirectory();
  }

  ensureSubdirectory(path?: string, create: boolean = true): Stats | false {
    mkdirp.sync(this.path(path));
    return statSync(this.path(path)) ?? false;
  }

  fileExists(filePath: string): Stats | false {
    return statSync(this.path(filePath)) ?? false;
  }

  path(relativePath?: string): string {
    if (is.nonEmptyStringAndNotWhitespace(relativePath)) {
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
