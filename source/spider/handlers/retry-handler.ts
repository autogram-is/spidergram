import { SpiderLocalContext } from '../options.js';
import { Request } from 'crawlee';

export async function retry(
  context: SpiderLocalContext & { request: Request },
  error: Error
) {}
