export * from './vertices/index.js';
export * from './edges/index.js';
export * from './helpers/index.js';

export interface SavedFile extends Record<string, unknown> {
  bucket?: string;
  path: string;
}
