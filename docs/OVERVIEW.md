# Spidergram crash course

## What it's built with

- [Crawlee](https://crawlee.dev): Apify's excellent Crawlee project handles the meat and potatoes work of recursively crawling and parsing url responses using a variety of technologies. Spidergram's core `Spider` class is built on top of Crawlee's PlaywrightCrawler.
- [ArangoDB](https://arangodb.org): Arango is a free/open source database engine that can store large, semi-structured documents *and* complex graph data, exposing them both with a single query/reporting language. Although Spidergram's underlying data entities can be stored anywhere serialized JSON is supported, its workflow and reporting tools are built to leverage Arango, and its default crawling handlers all assume data is being stored in Arango.
- [Oclif](https://oclif.org) for command line configuration, analysis, and crawl monitoring tools that can be extended for specific projects.
- [SheetJS](https://sheetjs.com) to import and export complex spreadsheet data; never settle for a folder full of CSV files again.
- [Vega](https://vega.github.io/vega/) to quickly generate visualizations of complex data and relationships.

## Spidergram's Data Model

- **UniqueUrls** and **Resources**: The core domain entities Spidergram uses to store crawled information. They represent discovered URLs (either from your configuration or discovered by parsing other pages).
- **RespondsWith** and **LinksTo**: The two key relationships populated during a default Spidergram crawl. They represent the relationship between a UniqueUrl and the Resource that it generates when visited; and the relationship between a Resource and *any* UniqueUrl that it links *to*.
- **IsChildOf**, **IsVariantOf**, and **AppearsOn**: Three additional relationship types that aren't populated during a default crawl, but can be used by post-crawl analysis tools to represent things like URL hierarchies, navigation hierarchies, alternate-language versions of a page, and sub-page components that are reused across many pages.
- **Fragments** and **DataSets**: Although the default Spidergram crawl doesn't populate them, Fragments can be created by custom crawl scripts to store sub-page elements like design patterns and CMS content that needs to be analyzed independent of the page it's found on. Datasets can be used to store large chunks of semi-structured information like imported analytics data, spreadsheets, etc.

Custom document and relationship types can be added for project or domain-specific needs. A *Business Department* entity that connects to Resources via an *IsResponsibleFor* relationship, for example, might allow ownership information to be grafted onto the pool of Resources. A *Content* entity might track recurring instances of CMS entities that don't correspond 1:1 with a single page. Knock yourself out.
