import { Resource } from '../../model/index.js';

export function getMarkup(
  input: string | Resource | cheerio.Root,
): string {
  if (typeof input === 'string') {
    return input;
  } else if (input instanceof Resource) {
    return input.body ?? '';
  } else {
    return input.html();
  }
}
