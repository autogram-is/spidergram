import { fileURLToPath } from 'node:url';
import EventEmitter from "eventemitter3";

export abstract class Pipeline extends EventEmitter {
  downloadPath: string = fileURLToPath(new URL('/data/downloads', import.meta.url));
}