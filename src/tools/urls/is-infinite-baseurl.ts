import { ParsedUrl } from "@autogram/url-tools";

/**
 * This is a first pass at detecting infinitely-deep repeating URLs.
 * See {@link https://github.com/autogram-is/spidergram/issues/42|the github issue detailing the problem}
 * for details.
 */
export function isInfiniteBaseUrl(url: ParsedUrl, context?: ParsedUrl) {
  // Some naive checks can also be done with just the core URL. In particular,
  // check to make sure the final path segment hasn't repeated more than twice.
  let instances = 0;
  let lastSegment = '';
  for (const segment in url.path) {
    if (segment == lastSegment) {
      instances++;
    } else {
      instances = 0;
    }
    lastSegment = segment;

    // This will catch `example.com/dir/page/page/page but not /dir/page/dir/page…
    if (instances > 2) return true;
  }
  return false;
}