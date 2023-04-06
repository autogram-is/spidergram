import { ParsedUrl } from '@autogram/url-tools';

/**
 * This is a first pass at detecting infinitely-deep repeating URLs.
 * See {@link https://github.com/autogram-is/spidergram/issues/42 | the github issue detailing the problem}
 * for details.
 */
export function isRepeatingPath(url: ParsedUrl, threshold = 3) {
  if (threshold < 2) return false;

  const segments = url.path.filter(s => s !== '');
  let lastSegment = segments[segments.length-1];
  let instances = 0;

  for (const segment of segments.reverse()) {
    if (segment == lastSegment) {
      instances++;
    } else {
      return false;
    }
    lastSegment = segment;

    // This will catch `example.com/dir/page/page/page but not /dir/page/dir/page…
    if (instances >= threshold) return true;
  }
  return false;
}
