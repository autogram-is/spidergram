# Why this thing?

Large-scale inventory and analysis of web content is kind of hellish. Most automated tools are focused on SEO, and assume that a spreadsheet of URLs is the desired endgame. On the other hand, most programmer-friendly web scraping toolkits are built to automate web APIs or extract specific bits of data from others' web sites. (Grabbing a list of every product in an Amazon category, extracting job listings, etc.)

[Autogram](https://autogram.is) often works with companies that are trying to get a handle on their own huge web ecosystems. We needed:

- Simple exploratory spidering, *and* complex conditional rules for normalizing and traversing large multi-site content ecosystems.
- The ability to preserve complex relationships between each page, *and* layer on additional information from other sources like internal client spreadsheets and CMS inventories, analytics APIs, etc.
- A solid framework for iterative analysis of that multi-layered data, not just a million-row spreadsheet and two weeks with Excel.

There are tons of useful programs, hosted services, and open source projects that do *some* of that, but finding anything that supported it all was a nightmare. Unforatunately, we're huge nerds, so we had to go build it.

## The tech

Spidergram is a pure ESM Node.js project written in Typescript; it assembles a laundry list of excellent third-party open source projects including [ArangoDB](https://www.arangodb.com), [Crawlee](https://crawlee.dev), [Playwright](https://playwright.dev), [Cheerio](https://cheerio.js.org), [HtmlToText](https://github.com/html-to-text/node-html-to-text), [SheetJS](https://sheetjs.com), and more.
