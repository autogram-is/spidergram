import { getCheerio } from "./get-cheerio.js";

export function chopBySelector<T = string | cheerio.Root>(
  input: T,
  selectors: Record<string, string>,
  discardRemainder = false
): Record<string, T> {
  const results: Record<string, T> = {};
  const $ = typeof input === 'string' ? getCheerio(input) : input as cheerio.Root;
  for (const [label, selector] of Object.entries(selectors)) {
    console.log(label, selector);
  }
  return results;
}