# Spidergram Changelog

## v0.9.0-dev (in progress)

This release is dedicated to Gwen Stacy of Earth-6160, aka Spider-Gwen.

- Improved **report/query helpers**. Build and run simple reports using the `Query` class, save existing queries as JSON definitions for reuse, and load/modify pre-built queries using the `Query` class's helper methods. Classes like `GraphWorker` that previously used ArangoJS's `GeneratedAqlQuery` type to define custom filter snippets now use filters, sorts, etc in the same JSON format used by `Query`.
- **Ad-hoc data storage** with the `Dataset` and `KeyValueStore` classes. Both offer static `open` methods that give quick access to default or named data stores -- creating new storage buckets if needed, or pulling up existing ones. Datasets offer `pushItem(anyData)` and `getItems()` methods, while KeyValueStores offer `setItem(key, value)` and `getItem(key)` methods. Behind the scenes, they create and manage dedicated ArangoDB collections that can be used in custom queries.
- **PDF and DocX parsing** via `FileTools.Pdf` and `FileTools.Document`, based on the [pdf-parse](https://gitlab.com/autokent/pdf-parse) and [mammoth](https://github.com/mwilliamson/mammoth.js) projects. Those two formats are a first trial run for more generic parsing/handling of arbitrary formats; both can return filetype-specific metadata, and plaintext versions of file contents. For consistency, the Spreadsheet class has also been moved to `FileTools.Spreadsheet`.
- **Site technology detection** via `BrowserTools.Fingerprint`. Fingerprinting is currently based on the [Wappalyzer](https://www.wappalyzer.com) project and uses markup, script, and header patterns to identify the technologies and platforms used to build/host a page.
- Improved **CLI tools**. The new `spidergram report` command can pull up filtered, aggregated, and formatted versions of Spidergram crawl data. It can output to tabular overviews on the command line, raw JSON files for use with data visualization tools, or ready-to-read Excel worksheets. The `spidergram probe` command allows the new Fingerprint tool to be run from the command line, as well.

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
