# Spidergram: Structural analysis tools for complex web sites

Large-scale inventory and analysis of web content is kind of hellish. Most automated tools are focused on SEO analysis and assume that a spreadsheet of URLs is the desired endgame. On the other hand, most programmer-friendly web scraping toolkits are built to automate web APIs or extract specific bits of data from others' web sites. (Grabbing a list of every product in an Amazon category, for ex.)

Autogram often works with companies that are trying to get a handle on their own huge content ecosystems. We needed:

- Support for simple exploratory spidering, *and* complex conditional rules for normalizing and traversing large multi-site content ecosystems.
- The ability to preserve the graph-like relationships between each page, *and* layer on additional information from other sources like internal client spreadsheets and CMS inventories, analytics APIs, etc.
- A solid framework for iterative analysis of that multi-layered data, not just a million-row spreadsheet and two weeks with Excel.

There are tons of useful programs, hosted services, and open source projects that do *some* of that, but finding anything that supported it all was a nightmare. Unforatunately, we're huge nerds, so we had to go build it.

## Why this thing?

Spidergram's core goal is provide a toolbox of composable web spidering and scraping tools, with sensible defaults for common content inventory and analysis tasks. Inspired by the 11ty project, quite a bit of customization is possible by passing new settings into its classes, but full control can be achieved by composing new crawl processes and analysis pipelines out of the individual components. Although most can be ignored if you're using pre-built processes, customizing them will be easier if you understand how the pieces fit together. 

## The Moving Pieces

- **Pipeline**: A structured set of tasks that enforces a particular Spidergram workflow. Pipelines can be used as-is (passing in specific data like 'the list of URLs to crawl') or they can be built from scratch from existing or custom Tasks.
- **Task**: A specific step in a Pipeline that wraps data retrieval, processing, validation, or a sub-collection of tasks. Individual tasks define the data they need and the data they output. They can run in order, in parallel, or loop based on a given condition.
- **Graph**: A collection of named Entities and Relationships that make up a Spidergram dataset. Entities can be added to and removed from a Graph, and entities that match specific criteria can be pulled out for further processing. A new "subgraph" can be created from any set of in-memory entries, merged back into the original graph, or used as a new starting point for analysis. (The default graph implementation saves and loads serialized JSON files; the companion `sqlite-graph` project adds a serverless database backend, and is probably a good addition for any large crawl. )
  - **UniqueUrls**, **Statuses**, and **Resources**: The core domain entities in Spidergram's default graph. They represent discovered URLs (either from your configuration or discovered by parsing other pages); status information about URLs that were visited but returned errors or didn't match the crawl criteria; and fully-retrieved pages or downloadable files found during a crawl.
  - **RespondsWith** and **LinksTo**: The two default relationships in Spidergram's default graph. They represent the relationship between a UniqueUrl and the Status or Resource that it generates when visited; and the relationship between a Resource and *any* UniqueUrl that it links *to*.
  - **Plugins** can add additional domain entities and relationships to the graph — a *Business Department* entity that connects to Resources via an *IsResponsibleFor* relationship, for example, might allow ownership information to be grafted onto the pool of Resources.
- **Crawler**: Handles batch-processing and concurrency when retrieving a large number of URLs. Acts as the "dispatcher" for Fetchers. A simple fetcher would take a list of URLs, pass them one by one to a Fetcher, and return the aggregated results. More complicated ones could scan for links and continue fetching recursively, or identify unique domain names and check for sitemap.xml data before searching for other URLs.
- **Fetcher**: Fetchers are responsible for retrieving the content of a particular URL, for various definitions of "content," and returning a collection of Graph entities representing it. Custom fetchers may perform additional implied work (taking a screenshot, catalogging all resources loaded during page rendering, profiling the page's performance, etc.)
- **Filters**, **Mutators**, and **Extractors**: Crawling and analyzing web content involves a lot of sifting and parsing. Spidergram defines a few types of standard helper functions so that code can easily reuse them when possible. *Filters* take a particular type of object and return a true or false; *Mutators* take a particular kind of object and return a modified version of that object; and *Extractors* take a particular object and return new data derived from it. Examples include the `isValidWebUrl` filter, the `urlNormalizer` mutator, and the `getBodyLinks` extractor. All the components mentioned above (Crawlers, the Graph, Pipelines, etc) use these helper functions to make important decisions during processing, so you can swap in different filtering and extraction logic without rewriting whole classes.

## Complimentary Projects
- `spidergram-template` to quickly spin up a customized crawl pipeline using Spidergram.
- `spidergram-cli` for command line triggering of pipelines, interactive testing of filter/mutator logic, and import/export of data from existing graphs.
- `spidergram-playwright` for fetching of fully rendered pages in a headless browser, performance profiling, and screenshot generation during crawls.
- `spidergram-cms-extractors` for pre-written extractors that pull site structure and content model metadata from common CMSs' default markup.
- `sqlite-graph` for database storage of spidergram graph data
