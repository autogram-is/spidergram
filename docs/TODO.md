# Future plans for Spidergram

Spidergram is a tool we use when solving problems for our clients; it's been evolving for several years and will continue to evolve as we spot new and interesting weird stuff in the wild.

Spidergram is currently "under active development," which is a nice way of saying that things change a lot. We're working towards more release-to-release stability in the internal APIs and configuration formats; the 0.10.0 release marks a significant improvement in that regard and we'll be building more documentation around it as a result.

Moving forward, our plans include:

- Additional documentation
- Additional example project templates
  - [x] Site-specific content extraction and auditing
  - [x] Pattern analysis to audit design system usage across sites
  - [ ] Path traversal to identify hard-to-find content
- Reusable helpers and utilities for common analysis tasks
  - [x] Query-builder helpers for common reports
  - [x] CMS detection helper functions
  - [x] Integration with third-party performance and A11y audit tools
  - [ ] A larger library of pre-built visualizations
- Technical improvements
  - [x] Pre-configured Docker image for Arango
  - [ ] Better test coverage
  - [ ] Migration to a multi-project monorepo to break up the big dependency footprint
  - [ ] Cleaner support for crawling authenticated content
- Improved Crawlee integration
  - [ ] A dedicated SpiderCrawler class
  - [ ] Arango-backed versions of the RequestQueue, DataSet, and KeyValueStore utilities
  - [ ] Support for cloud-hosted crawling as an Apify actor

If you're interested in contributing, feel free to jump into the issue queue and/or [contact us](https://autogram.is) with your ideas.

If you're wrestling with complicated digital publishing, content operations, or design system challenges you should *definitely* [drop us a line](https://autogram.is/listening/), because we love that shit. We've helped dozens of the world's largest tech companies, educational institutions, publishers, and retailers; we get dangerously bored without complicated problems to solve, and we'd love to hear about yours.
