import { parseWithCheerio } from './parse-with-cheerio.js';

export function getBodyAttributes(input: string | cheerio.Root) {
  const $ = typeof input === 'string' ? parseWithCheerio(input) : input;
  const output: Record<string, string | string[]> = { ...$('body').attr(), ...$('body').data() };
  if ('class' in output) {
    output.class = output.class?.toString().replace(/\s+/, ' ').split(' ');
  }
  return output;
}