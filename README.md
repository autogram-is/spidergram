# Spidergram

Spidergram is a customizable toolkit for crawling and analyzing complicated web properties. While it can be used with large or small sites, we (the folks at [Autogram](https://autogram.is)) designed to accomodate "ten web sites in a trench coat" scenarios where multiple CMSs, multiple domains, and multiple design systems maintained by multiple teams are all in play.

## Installation

- Spidergram requires Node 18; you can check which version you have installed using `node -v`.
- Spidergram uses [ArangoDB](https://www.arangodb.com/) to store crawled data. You can [download the installer](https://www.arangodb.com/download-major/), set it up using homebrew on a Mac (`brew install arangodb`), or run it in a [Docker container](https://hub.docker.com/_/arangodb) on most platforms. See the [Data Model documentation](docs/MODEL.md) for more details about what Spidergram stores and why.
- To use Spidergram as a command line tool (the best option if you're new), run `npm install -g spidergram`.

## Crawling a web site

- Once you have Spidergram installed, `cd` to the directory where'd you'd like to store crawl data (temp files, downloads, generated reports, etc).
- Run `spidergram status` to ensure it can find your ArangoDB server.
- Run `spidergram go https://some-web-site.biz` and watch the progress bar go; once it's complete it will analyze every page and generate a summary report.

The `spidergram go` command is a wrapper around three other commands: `spidergram crawl`, `spidergram analyze`, and `spidergram report`. You can use them to run each step in the process independently. For example, to re-run the crawl with different options, you can use the command `spidergram crawl --erase https://some-web-site.biz`. It will clear the database and start from scratch. You can aso enter additional URLs (or run the `crawl` command multiple times without the `--erase` flag) to combine multiple domains into a single crawl.

The [CLI Documentation](docs/CLI.md) includes additional details about Spidergram's subcommands and options. You can build custom reports, inspect individual URLs before crawling them, generate tree diagrams representing URL structures, and more.

To customize Spidergram's crawl behavior, analysis options, and report output, check the [configuration documentation](docs/CONFIG.md). You can generate a pre-buily configuration with the standard options by running the `spidergram init` command in your project directory.

To build your own custom NodeJS crawling and analysis tool on top of Spidergram's API, read the [API docs](docs/API.md). It'll be fun. You know you want to.
