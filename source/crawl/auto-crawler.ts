// Given a set of URLs, a set of URL processing rules, and boolean flags
// for high-level behaviors, recursively parse the contents of the URLs.
// Specific flags of interest include "respect robots.txt" and "prioritize
// sitemap.xml".
//
// Use an EventEmitter to broadcast each batch of retrieved resources and
// found URLs; recursively visit new URLs until a depth, storage, or other
// limit is met.
//
// When complete, return the full set of fetched resources, discovered URLs,
// and relationship objects.