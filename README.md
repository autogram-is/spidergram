# Spidergram: Structural analysis tools for complex web sites

Large-scale inventory and analysis of web content is kind of hellish. Most automated tools are focused on SEO analysis and assume that a spreadsheet of URLs is the desired endgame. On the other hand, most programmer-friendly web scraping toolkits are built to automate web APIs or extract specific bits of data from others' web sites. (Grabbing a list of every product in an Amazon category, for ex.)

Autogram often works with companies that are trying to get a handle on their own huge content ecosystems. We needed:

- Support for simple exploratory spidering, *and* complex conditional rules for normalizing and traversing large multi-site content ecosystems.
- The ability to preserve the complex relationships between each page, *and* layer on additional information from other sources like internal client spreadsheets and CMS inventories, analytics APIs, etc.
- A solid framework for iterative analysis of that multi-layered data, not just a million-row spreadsheet and two weeks with Excel.

There are tons of useful programs, hosted services, and open source projects that do *some* of that, but finding anything that supported it all was a nightmare. Unforatunately, we're huge nerds, so we had to go build it.

## Why this thing?

Spidergram's core goal is provide a toolbox of composable web spidering and scraping tools, with sensible defaults for common content inventory and analysis tasks. Inspired by the 11ty project, quite a bit of customization is possible by passing new settings into its classes, but full control can be achieved by composing new crawl processes and analysis pipelines out of the individual components. Although most can be ignored if you're using pre-built processes, customizing them will be easier if you understand how the pieces fit together. 

## What Spidergram is built with
- Crawlee: Apify's excellent Crawlee project handles the meat and potatoes work of recursively crawling and parsing url responses using a variety of technologies. Spidergram provides convenience wrappers to translate Crawlee's raw crawl output to Spidergram data structures.
- ArangoDB: Arango is a free/open source database engine that can store large, semi-structured documents _and_ complex graph data, exposing them both with a single query/reporting language. You can bypass it entirely if you don't need complex graph data (like path traversal, etc), but Spidergram's default analysis and reporting tools are built to leverage it.
- Listr2: Crawling sites and processing the results is a complicated, multi-step process. The Listr library makes it easy to compose those workflows out of smaller reusable "task" functions, while exposing convenient status consoles and prompting for input when necessary. As with all of Spidergram's components, you can also ignore it and write custom code to wrangle the crawl/process/analyze workflow yourself.
- SheetsJS: Spreadsheets are a terrible primary data store, but nearly every web inventory/analysis project ends up _generating_ them at some point. SheetsJS handles the grunt work of translating complicated JSON data into cleanly-formatted spreadsheets in a variety of formats. Spidergram's default reports use it extensively.

## What Spidergram adds to the mix
- Quick, easy-to-tweak URL filtering and transformation rules
- A pre-built, easy-to-extend data model that preserves the complexity of multi-site web data
  - **UniqueUrls**, and **Resources**: The core domain entities in Spidergram's default graph. They represent discovered URLs (either from your configuration or discovered by parsing other pages), and the data retrieved from those URLs.
  - **RespondsWith** and **LinksTo**: The two key relationships populated during a default Spidergram crawl. They represent the relationship between a UniqueUrl and the Resource that it generates when visited; and the relationship between a Resource and *any* UniqueUrl that it links *to*.
  - **IsChildOf**, **IsVariantOf**, and **AppearsOn**: Three additional relationship types that aren't populated during a default crawl, but can be used by post-crawl analysis tools to represent things like URL hierarchies, navigation hierarchies, alternate-language versions of a page, and sub-page components that are reused across many pages.
  - **Plugins** can add additional document and relationship types to the graph — a *Business Department* entity that connects to Resources via an *IsResponsibleFor* relationship, for example, might allow ownership information to be grafted onto the pool of Resources.
