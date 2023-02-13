# Spidergram Changelog

## v0.9.0-dev (in progress)

This release will be dedicated to Gwen Stacy of Earth-6160, star of *Into The Spider-Verse*.

- **PDF Parsing** via `DocumentTools.getPdfData()`, based on the [pdf-parse](https://gitlab.com/autokent/pdf-parse) project. It takes URL or file path as a string, or a ReadableStream containing PDF data, and returns the PDF's metadata and text contents.
- **Site fingerprinting** via `BrowserTools.Fingerprint`. It's based on the [Wappalyzer](https://www.wappalyzer.com) project and uses markup, script, and header patterns to identify the technoliges and platforms used to build and host a page.
- Improved **report/query helpers**. It's now possible to build and run simple reports without knowing any AQL, using the `Query` class.
- General-purpose **CLI reporting tool**. The new `spidergram report` command can pull up filtered, aggregated, and formatted versions of Spidergram crawl data. It can output to tabular overviews on the command line, raw JSON files for use with data visualization tools, or ready-to-read Excel worksheets.

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
