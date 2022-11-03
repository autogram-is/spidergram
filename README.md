# Spidergram: Structural analysis tools for complex web sites

Large-scale inventory and analysis of web content is kind of hellish. Most automated tools are focused on SEO, and assume that a spreadsheet of URLs is the desired endgame. On the other hand, most programmer-friendly web scraping toolkits are built to automate web APIs or extract specific bits of data from others' web sites. (Grabbing a list of every product in an Amazon category, for ex.)

Autogram often works with companies that are trying to get a handle on their own huge content ecosystems. We need:

- Simple exploratory spidering, *and* complex conditional rules for normalizing and traversing large multi-site content ecosystems.
- The ability to preserve the complex relationships between each page, *and* layer on additional information from other sources like internal client spreadsheets and CMS inventories, analytics APIs, etc.
- A solid framework for iterative analysis of that multi-layered data, not just a million-row spreadsheet and two weeks with Excel.

There are tons of useful programs, hosted services, and open source projects that do *some* of that, but finding anything that supported it all was a nightmare. Unforatunately, we're huge nerds, so we had to go build it.

## Why this thing?

Spidergram's core goal is provide a toolbox of composable web spidering and scraping tools, with sensible defaults for common content inventory and analysis tasks. Inspired by the 11ty project, quite a bit of customization is possible by passing new settings into its classes, but full control can be achieved by composing new crawl processes and analysis pipelines out of the individual components. Although most can be ignored if you're using pre-built processes, customizing them will be easier if you understand how the pieces fit together.

## What Spidergram is built with

- [Crawlee](): Apify's excellent Crawlee project handles the meat and potatoes work of recursively crawling and parsing url responses using a variety of technologies. Spidergram's core `Spider` class is built on top of Crawlee's PlaywrightCrawler.
- [ArangoDB](): Arango is a free/open source database engine that can store large, semi-structured documents *and* complex graph data, exposing them both with a single query/reporting language. Although Spidergram's underlying data entities can be stored anywhere serialized JSON is supported, its workflow and reporting tools are built to leverage Arango's capabilities.
- Utility helpers
  - [TypeFS](https://typefs.io) to manage multiple buckets of files (configuration, web downloads, page and page-element screenshots, etc) locally or in cloud storage.
  - [SheetJS](https://sheetjs.com) to import and export complex spreadsheet data; never settle for a folder full of CSV files again.
  - [Oclif](https://oclif.org) and [Listr2](https://listr2.kilic.dev) for command line configuration, analysis, and crawl monitoring tools that can be extended for specific projects.
  - [D3](https://d3js.org) to generate visualizations of complex structural relationships and patterns.

## What Spidergram adds to the mix

- A pre-built, easy-to-extend data model that preserves the complexity of multi-site web data
  - **UniqueUrls**, and **Resources**: The core domain entities in Spidergram's default graph. They represent discovered URLs (either from your configuration or discovered by parsing other pages), and the data retrieved from those URLs.
  - **RespondsWith** and **LinksTo**: The two key relationships populated during a default Spidergram crawl. They represent the relationship between a UniqueUrl and the Resource that it generates when visited; and the relationship between a Resource and *any* UniqueUrl that it links *to*.
  - **IsChildOf**, **IsVariantOf**, and **AppearsOn**: Three additional relationship types that aren't populated during a default crawl, but can be used by post-crawl analysis tools to represent things like URL hierarchies, navigation hierarchies, alternate-language versions of a page, and sub-page components that are reused across many pages.
  - **Plugins** can add additional document and relationship types to the graph. A *Business Department* entity that connects to Resources via an *IsResponsibleFor* relationship, for example, might allow ownership information to be grafted onto the pool of Resources. A *Content* entity might track recurring instances of CMS entities that don't correspond 1:1 with a single page. Knock yourself out.
- Maximum preserveration of crawl data. Spidergram uses a lot of memory and disk space, because it remembers everything it sees. You can pare it down if you don't need it, but you'll never be left wondering where the number in a summary report came from: the data is all there to query, slice, and dice.
