import { Resource } from '../../model/index.js';
import * as cheerio from 'cheerio';

export function getCheerio(
  input: string | Buffer | Resource | cheerio.Root,
  options?: Parameters<typeof cheerio.load>[1],
): cheerio.Root {
  if (typeof input === 'string') {
    return cheerio.load(input, options);
  } else if (input instanceof Buffer) {
    return cheerio.load(input, options);
  } else if (input instanceof Resource) {
    return cheerio.load(input.body ?? '', options);
  } else {
    return input;
  }
}
