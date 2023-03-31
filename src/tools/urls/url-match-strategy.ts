/**
 * Describes a list of supported strategies for comparing two URLs to each other.
 * These are most useful in crawling scenarios where candidate URLs are evaluated
 * for potential archiving based on the URL currently being archived.
 * 
 * Critically, these strategies are only useful in situations where both the candidate
 * URL and the 'context' URL are available — in other scenarios these strategies will
 * always result in FALSE matches, and URLs will be skipped.  
 */
export enum UrlMatchStrategy {
  /**
   * Matches any URLs found
   */
  All = 'all',

  /**
   * Matches a URL if it has the same hostname as the current URL.
   *
   * For example, `https://wow.example.com/hello` will be matched for a current url of
   * `https://wow.example.com/`, but `https://example.com` will not be matched.
   */
  SameHostname = 'same-hostname',

  /**
   * Matches a URL if it has the same domain as the current URL.
   *
   * For example, `https://wow.an.example.com` and `https://example.com` will both be matched for
   * a current url of `https://example.com`.
   */
  SameDomain = 'same-domain',

  /**
   * Matches a URL if it has the same domain, and its path starts with the same string, as the
   * current URL.
   *
   * For example, `https://example.com/news/2023` will be matched with a current url of
   * `https://example.com/news/`, but 'https://example.com/updates/' will not.
   */
  SameDirectory = 'same-directory',

  /**
   * Matches no URLs; useful when all or some URLs should be saved, but none should be enqueued.
   */
  None = 'none',
}
