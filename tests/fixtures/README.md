# Test fixtures

Testing HTTP crawler code is tricky, obviously. You'd like to test against real data, but unleashing a buggy crawler on a public site is a bit of a menace. Code in this directory is used to mock up fake HTTP servers and responses when testing Crawler, Fetcher, and extractor classes.

## Mock site structure
Fixtures in the `known` directory are used to reproduce a fixed site structure — useful for validating that a given implementation yields 'correct' results. Although it's likely to grow over time, at present it looks like:

- http://spidergram.test
  - /index.html
  - /error.html
  - /about.html
  - /sitemap.xml
  - /favicon.ico
  - /news
    - /index.html
    - /2022
      - /index.html
      - /story-1.html
      - /story-2.html
    - /2021
      - /index.html
      - /story-1.html
      - /story-2.html
  - /files
    - /example.pdf  - linked from /about.html
    - /example.zip  - linked from /about.html
    - /example.jpeg - used inline on index.html
    - /logo.jpeg    - used inline on all pages
    - /logo.svg     - used inline on all pages
    - /site.css     - linked in meta tages on all pages
    - /site.js      - linked in meta tages on all pages

- http://broken.test - Returns 404s, or 403/500 at the matching endpoints.  
  - /301 - redirects to http://external.test
  - /302 - redirects to http://external.test
  - /404
  - /500

- http://external.test - Returns the contents of any.html, regardless of request path
  - /any.html

- http://login.test - Requires basic auth: user/password
  - /index.html 

## Snapshots

The `shapshots` directory contains recorded HTTP responses obtained from real-world servers, mostly representative of odd or extreme edge cases or well-known home pages. They'll accumulate as we go, and are used with `ava-nock` during testing.