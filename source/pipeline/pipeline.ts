import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';

export abstract class Pipeline extends EventEmitter {
  storagePath: string = fileURLToPath(
    new URL('/data/downloads', import.meta.url),
  );
}
