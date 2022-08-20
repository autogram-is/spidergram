import { EventEmitter } from 'eventemitter3';
import { Entity } from '@autogram/autograph';
import { UniqueUrl, RespondsWith, Status, Resource } from '../graph/index.js';

export abstract class Fetcher extends EventEmitter {
  abstract fetch(url: UniqueUrl, ...args: unknown[]): Promise<Entity[]>;
  abstract check(url: UniqueUrl, ...args: unknown[]): Promise<Entity[]>;
}
