# Spidergram Changelog

## v0.9.6 - 23-03-15

- Config can now live in a YAML file — it's clunky for large structured configuration blocks, but just right for a handful of properties like DB connection strings or a few normalizer settings.
- The `getPageData` function now parses JSON and JSON+LD chunks by default. Normal scripts are still unparsed by default, but JSON+LD in particular often holds a wealth of useful Schema.org properties and configuration data. In Drupal, for example, the `drupal-settings-json` block often exposes internal category and tag information for each piece of content.

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
