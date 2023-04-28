# Spidergram

Spidergram is a customizable toolkit for crawling and analyzing complicated web properties. While it can be used with large or small sites, it's designed to accomodate "ten web sites in a trench coat" scenarios where multiple CMSs, multiple domains, and multiple design systems maintained by multiple teams are all in play.

## Why this thing?

Large-scale inventory and analysis of web content is kind of hellish. Most automated tools are focused on SEO, and assume that a spreadsheet of URLs is the desired endgame. On the other hand, most programmer-friendly web scraping toolkits are built to automate web APIs or extract specific bits of data from others' web sites. (Grabbing a list of every product in an Amazon category, extracting job listings, etc.)

[Autogram](https://autogram.is) often works with companies that are trying to get a handle on their own huge web ecosystems. We needed:

- Simple exploratory spidering, *and* complex conditional rules for normalizing and traversing large multi-site content ecosystems.
- The ability to preserve complex relationships between each page, *and* layer on additional information from other sources like internal client spreadsheets and CMS inventories, analytics APIs, etc.
- A solid framework for iterative analysis of that multi-layered data, not just a million-row spreadsheet and two weeks with Excel.

There are tons of useful programs, hosted services, and open source projects that do *some* of that, but finding anything that supported it all was a nightmare. Unforatunately, we're huge nerds, so we had to go build it.

## Installation

### Requirements

- Node 18; you can check which version you have installed using `node -v`.
- [ArangoDB](https://www.arangodb.com/) for storage and analysis of crawl data. ArangoDB's community edition is available as [pre-compiled binaries](https://www.arangodb.com/download-major/), can be installed using homebrew on a Mac (`brew install arangodb`), and can be run in a [Docker container](https://hub.docker.com/_/arangodb) on most platforms.

### Starting a new project

`npx create-spidergram` will set up a fresh node.js project using one of several example crawler projects. For more details on the example projects, see the [Create Spidergram](https://github.com/autogram-is/create-spidergram) project page.

### As a command-line utility

`npm install -g spidergram` will install Spidergram globally, giving you access to its command line interface, and `spidergram --help` will list its available options. Importing existing sitemaps, kicking off a new crawl, generating simple reports, and checking on the status of the database can all be done from the CLI. This CLI doesn't allow as much control as creating a custom project, but it's a quick way to kick the tires.


## The tech

Spidergram is a pure ESM Node.js project written in Typescript; it assembles a laundry list of excellent third-party open source projects including [ArangoDB](https://www.arangodb.com), [Crawlee](https://crawlee.dev), [Playwright](https://playwright.dev), [Cheerio](https://cheerio.js.org), [HtmlToText](https://github.com/html-to-text/node-html-to-text), [SheetJS](https://sheetjs.com), and more.

## Future plans

Spidergram is a tool we use when solving problems for our clients; it's been evolving for several years and will continue to evolve as we spot new and interesting weird stuff in the wild. At the moment, our plans include:

- Additional documentation
- Additional example project templates
  - [x] Site-specific content extraction and auditing
  - [ ] Path traversal to identify hard-to-find content
  - [x] Pattern analysis to audit design system usage across sites
- Reusable helpers and utilities for common analysis tasks
  - [x] Query-builder helpers for common reports
  - [ ] A larger library of pre-built visualizations
  - [x] CMS detection helper functions
  - [x] Integration with third-party performance and A11y audit tools
- Technical improvements
  - [ ] Better test coverage
  - [ ] Migration to a multi-project monorepo to break up the big dependency footprint
  - [x] Pre-configured Docker image for Arango
  - [ ] Cleaner support for crawling authenticated content
- Improved Crawlee integration
  - [ ] A dedicated SpiderCrawler class
  - [ ] Arango-backed versions of the RequestQueue, DataSet, and KeyValueStore utilities
  - [ ] Support for cloud-hosted crawling as an Apify actor

If you're interested in contributing, feel free to jump into the issue queue and/or [contact us](https://autogram.is) with your ideas.

If you're wrestling with complicated digital publishing, content operations, or design system challenges you should *definitely* [drop us a line](https://autogram.is/listening/), because we love that shit. We've helped dozens of the world's largest tech companies, educational institutions, publishers, and retailers; we get dangerously bored without complicated problems to solve, and we'd love to hear about yours.
