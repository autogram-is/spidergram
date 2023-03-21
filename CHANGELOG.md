# Spidergram Changelog

## v0.9.11 - 23-03-21

- Axe accessibility testing can be enabled for all pages in a crawl using the `spider.auditAccessibility` configuration flag. Setting it to TRUE returns full raw results for every page, while setting it to 'summary' yields a more manageable summary of a11y violations by severity.
- The `spidergram ping` (formerly `probe`) command now uses the core data extraction and page analysis functions; this makes it a useful way to preview what kinds of data Spidergram will find at a given URL.
- The `spidergram analyze` command now supports the `--filter <x>` and `--limit <n>` flags, making it easier to reprocess specific subsets of the craw data after tweaking content extraction rules.
- The `spidergram tree` (formerly `urls`) command now supports the `--filter <x>` flag when pulling URLs from the database. This makes it easier to build trees of specific sections or subsites.
- The `spidergram query` command no longer defaults to a limit of 20 records; while it's now easier to spam yourself, it's also less frustrating to generate useful output.
- The `spidergram ga`, `spidergram init`, and `spidergram sitemap` commands have been removed, as they rely on deprecated internal helpers or have been superceded by other functions.
- Technology fingerprinting now correctly includes header, meta tag, and script data when processing saved resources; technology fingerprinting should be noticably more accurate.

## v0.9.10 - 23-03-20

- Multi-query reports can be defined using the `Report` class, either by defining a `ReportConfig` object, or by building a custom Report subclass that handles its own data collection and output.
- Named Reports (or ReportConfig objects) can be defined in the `reports` property of the Spidergram config for reuse. The `spidergram report` CLI command can be used to trigger and run any defined reports.
- A new `spidergram go` CLI command accepts one or more URLs, and kicks off a crawl, page analysis, and report generation based on the currently loaded config, in a single command.
- The previous `spidergram report` command has been renamed `spidergram query`, as it's meant for running single ad-hoc queries.
- Raw AQL queries can be embedded as strings in the config's `queries` collection.
- Config files in [JSON5](https://test.com) format are now supported, for folks who don't buy 50gal drums of double-quotes at Costco.
- The shared `analyzePage()` method can now rebuild a page's `LinksTo` metadata; this is useful when region selectors have changed and you want to make sure your link reporting stays up to date. The `analyze` CLI command now has a `--links` flag, though it defaults to false. The `relink` CLI command has been removed.
- The `BrowserTools.getAxeReport` method, given a Playwright page handle, runs a full accessibility audit on the live page.
- To help keep final artifacts separate from internal data, a separate `outputDirectory` property has been added to Spidergram's configuration. A new 'output' file bucket is also part of the default configuration, and can be written to/read from by passing its name into the Spidergram config object's `files()` method. Passing in the name of a non-existent bucket will fall back to the default storage directory.

## v0.9.9 - 23-03-16

- Graph queries can be saved as named reporting presets in the 'queries' section of Spidergram's configuration. The `spidergram report` CLI now offers a `--query` flag that can use these presets by name. An 'errorPages' query is built into the default settings: `spidergram report -q errorPages`. A `spidergram report --list` flag is now available to list stored queries, as well.
- The spider now saves any cookies set during the page load on `Resource.cookies`. This improves the accuracy of technology fingerprinting, and can be useful in reconstructing certain on-page behavior. It can be turned off using the `spider.saveCookies` setting.
- Page analysis PropertyMaps now support a 'limit' option to be used in conjunction with the 'selector' option. It enforces a hard limit on the number of options that will be returned to populate the new property; using '1' as the limit will ensure a single value, never an array of values.

## v0.9.8 - 23-03-15

- The `getPageContent` function now now uses Cheerio to narrow down the page to its content region before passing HTML into `htmlToText`. Although HtmlToText can accept body selectors in its own config, its selector engine lacks support for some common CSS combinators, making common queries fail silently.
- Several deprecated options have been culled from the `EnqueueUrlOptions` interface. Flags that controlled robots.txt and sitemap.xml auto-discovery previously lived here, but complicated the URL search code uncessarily. As we've accumualted better lifecycle control options for the Spider itself, they're no longer needed.
- An additional option — `regions` — has been added to `EnqueueUrlOptions`. It can contain a dictionary of named selectors that will be used to chop the page up into named regions before searching for links. Links that are found will be labeled with the name of the region they're found in, and those labels will be preserved in the `LinksTo.label` property in the final crawl database. That property can then be used to filter graph traversal queries that map paths through a site. Super fun stuff.

## v0.9.7 - 23-03-14

- Config can now live in a YAML file — it's clunky for large structured configuration blocks, but just right for a handful of properties like DB connection strings or a few normalizer settings.
- The `getPageData` function now parses JSON and JSON+LD chunks by default. Normal scripts are still unparsed by default, but JSON+LD in particular often holds a wealth of useful Schema.org properties and configuration data. In Drupal, for example, the `drupal-settings-json` block often exposes internal category and tag information for each piece of content.
- `@oclif/core` has been out of date for a while, and is now updated to the latest release.

## v0.9.6 - 23-03-13

- Unmatched selectors in `propertyMap` no longer return the full HTML document.
- Mapping to deep property paths now sets `object.prop.subprop` rather than `object['prop.subprop']`
- Nicer handling of single-column result sets in `report` CLI
- Spidergram-specific env variables now shown in `project` CLI output

## v0.9.5 - 23-03-13

- `EntityQuery` execution now works when passed a string collection name.
- `Spider`, `WorkerQuery`, and `ScreenshotTool` events are now standardized on 'progress' and 'end'. The first parameter for both is a JobStatus object, making it easy to route the event to a shared progress bar or status display function.
- Events subscription methods return references to instances; this makes it easy to chain `spider.on(...)` and `worker.on(...)` calls during setup.
- `UrlEnqueueOptions.selector` is now `UrlEnqueueOptions.selectors`, and can accept a single CSS selector or a dictionary of named CSS selectors to categorize found links. (For example, header vs footer vs. body links). A `remapLinks` helper function, and the `relink` CLI command, can be used to rebuild existing LinkTo relationships.
- The `analyzePage` helper function runs data extracton, content analysis, and technology fingerprinting on a `Resource` using the current project configuration. Custom configuration can be passed in at runtime as well.
- `analyzePage` also supports simple property normalization via `propertyMap` on its options object. New properties on the Resource can be created from existing properties found during data extraction and content analysis, with fallbacks if specific properties weren't found.
- The `screenshot` CLI command now attempts to give a progress update.

## v0.9.2 - 23-03-10

- The `crawl`, `analyze`, and `probe` CLI functions now use global defaults.
- Added a convenience wrapper (`getPageTechnologies`) around the Fingerprint library.
- Config files can supply `pageTechnologies`, `pageData` and `pageContent` config options.
- Config scripts can supply `getPageTechnologies`, `getPageData` and `getPageContent` functions to globally override their operation.
- Fixed an issue that prevented `Spidergram.init()` from loading without a database.
- Added a handful of example queries in the default configuration.

## v0.9.1 - 23-03-09

- `Entity.get('property.path')` fallback value types should be `unknown`, not `undefined`.
- `WorkerQuery` wasn't updating the start/finish times in its status property.

## v0.9.0 - 23-03-08

This release is dedicated to teen crime-fighter Gwen Stacy of Earth-65. She juggles high school, her band, and wisecracking web-slinging until her boyfriend Peter Parker becomes infatuated with Spider-Woman. Unable to reveal her secret identity, Spider-Woman is blamed for Peter's tragic lizard-themed death on prom night… and Gwen goes on the run.

- Major Changes
  - **`Vertice` and `Edge` have been renamed** to `Entity` and `Relationship` to avoid confusion with ArangoDB graph traversal and storage concepts. With the arrival of the `Dataset` and `KeyValueStore` classes (see below), we also needed the clarity when dealing with full-fledged Entities vs random datatypes.
  - **HtmlTools.getPageContent() and .getPageData()** are both async, allowing them to use some of the aync parsing and extraction tools in our toolbox. If your extracted data and content suddenly appear empty, make sure you're **awaiting** the results of these two calls in your handlers and scripts.
  - **Improved report/query helpers**. The `GraphWorker` and `VerticeQuery` — both of which relied on raw snippets of AQL for filtering — have been replaced by a new query-builder system. A unified `Query` class can take a query definition in JSON format, or construct one piecemeal using fluent methods like `filterBy()` and `sort()`. A related `EntityQuery` class returns pre-instantiated Entity instances to eliminate boilerplate code, and a `WorkerQuery` class executes a worker function against each query result while emitting progress events for easy monitoring.
  - **`Project` class replaced by `Spidergram` class**, as part of the configuration management overhaul mentioned below. In most code, changing `const project = await Project.config();` to `const spidergram = await Spidergram.load();` and `const db = await project.graph();` to `const db = spidergram.arango;` should be sufficient.
- New Additions
  - **Spidergram configuration** can now live in .json, .js, or .ts files — and can control a much wider variety of internal behaviors. JS and TS configuration files can also pass in custom functions where appropriate, like the `urlNormalizer` and `spider.requestHandlers` settings. Specific environment variables, or `.env` files, can also be used to supply or override sensitive properties like API account credentials.
  - **Ad-hoc data storage** with the `Dataset` and `KeyValueStore` classes. Both offer static `open` methods that give quick access to default or named data stores -- creating new storage buckets if needed, or pulling up existing ones. Datasets offer `pushItem(anyData)` and `getItems()` methods, while KeyValueStores offer `setItem(key, value)` and `getItem(key)` methods. Behind the scenes, they create and manage dedicated ArangoDB collections that can be used in custom queries.
  - **PDF and DocX parsing** via `FileTools.Pdf` and `FileTools.Document`, based on the [pdf-parse](https://gitlab.com/autokent/pdf-parse) and [mammoth](https://github.com/mwilliamson/mammoth.js) projects. Those two formats are a first trial run for more generic parsing/handling of arbitrary formats; both can return filetype-specific metadata, and plaintext versions of file contents. For consistency, the Spreadsheet class has also been moved to `FileTools.Spreadsheet`.
  - **Site technology detection** via `BrowserTools.Fingerprint`. Fingerprinting is currently based on the [Wappalyzer](https://www.wappalyzer.com) project and uses markup, script, and header patterns to identify the technologies and platforms used to build/host a page.
  - **CLI improvements**. The new `spidergram report` command can pull up filtered, aggregated, and formatted versions of Spidergram crawl data. It can output to tabular overviews on the command line, raw JSON files for use with data visualization tools, or ready-to-read Excel worksheets. The `spidergram probe` command allows the new Fingerprint tool to be run from the command line, as well.
  - **Groundwork for cleaner CLI code**. While it's not as obvious to end users, we're moving more and more code away from the Oclif-dependent `SgCommand` class and putting it into the shared `SpiderCli` helper class where it can be used in more contexts. In the next version, we'll be leveraging these improvements to make Spidergram's built-in CLI tools take better advantage of the new global configuration settings.
- Fixes and minor improvements
  - Internal errors (aka, pre-request DNS problems or errors thrown during response processing) saave a wider range of error codes rather than mapping everything to `-1`. Any thrown errors are also saved in `Resource.errors` for later reference.
  - A subtle but long-standing issue with the `downloadHandler` (and by extension `sitemapHandler` and `robotsTxtHandler` choked on most downloads but "properly" persisted status records rather than erroring out. The improved error handling caught it, and downloads now work consistently.
  - A handful of request handlers were `awaiting` promises unecessarily, clogging up the Spider's request queue. Crawls with multiple concurrent browser sessions will see some performance improvements.

## v0.8.0 - 23-01-27

This release is dedicated to Miles Morales of Earth-6160, star of *Into The Spider-Verse*.

- Improvements to structured **data and content parsing**; `HtmlTools.getPageData()` and `HtmlTools.getPageContent()` are now useful as general-purpose extractors across most crawl data.
- `HtmlTools.findPattern()` now pulls **more data for each component**, including raw internal markup if desired.
- URL **hierarchy building and rendering**, and a general-purpose utility class for building hierarchies from other types of relationships like breadcrumb trails.
- **CLI improvements** (`spidergram urls` command gives quick access to the new hierarchy builder)

## v0.7.0 - 23-01-05

This release is dedicated to Cindy Moon, aka Silk, of Earth-616.

- New `Fragment` entity type for storing sub-page elements
- `findPattern` helper function to extract recurring elements from pages
- Automatic extraction of schema.org metadata
- Google Analytics integration
- Sitemap and Robots.txt parsing
- `Query` class to build and execute simple queries
- New `create-spidergram` project to spin up custom crawlers

## v0.6.0 - 22-12-02

This release is dedicated to Peter Parker of Earth 616, the original friendly neighborhood Spider Man.

Initial public release of Spidergram. Please do not fold, spindle, or mutilate.
