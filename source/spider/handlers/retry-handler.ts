import { SpiderLocalContext } from '../options.js';
import { Request } from 'crawlee';
import { IncomingMessage } from 'http';

export async function retry(
  context: SpiderLocalContext & { request: Request, response?: IncomingMessage },
  error: Error
) {}
