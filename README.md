# Spidergram: Structural analysis tools for complex web sites

Spidergram is a toolbox for exploring, auditing, and analyzing complicated web sites — particularly ones that use multiple CMSs, span more than one domain, and are maintained by multiple teams inside an organization. Although it works well for smaller projects, Autogram built it to overcome the roadblocks we hit when using existing crawling and inventory tools on our clients' complex, multi-site web properties. Using it to crawl your blog is a bit light swatting a fly with a Buick.

## Installation

### Requirements

- Node 18; you can check which version you have installed using `node -v`.

- [ArangoDB](https://www.arangodb.com/) for storage and analysis of crawl data. ArangoDB's community edition is available as [pre-compiled binaries](https://www.arangodb.com/download-major/), can be installed using homebrew on a Mac (`brew install arangodb`), and can be run in a [Docker container](https://hub.docker.com/_/arangodb) on most platforms.

### In a new project

`node init spidergram` will set up a fresh node.js project using one of several example crawler projects. For more details on the example projects, see the [Create Spidergram](https://github.com/autogram-is/create-spidergram) project page.

### In an existing project

`node install --save spidergram` will add Spidergram to your node.js project's dependencies. Nothing too fancy there.

### As a command-line utility

`npm install -g spidergram` will install Spidergram globally, giving you access to its command line interface, and `spidergram --help` will list its available options. Importing existing sitemaps, kicking off a new crawl, generating simple reports, and checking on the status of the database can all be done from the CLI. This CLI doesn't allow as much control as creating a custom project, but it's a quick way to kick the tires.

## Usage

In a node.js project, import the 'Spider' class, create an instance, and call its 'run' method. Without any other options, Spidergram will hit the URL you give it, save the contents to the database, search for other links *within the same domain*, and follow them until it's visited and saved everything it can find.

``` javascript
import { Spider } from 'spidergram';
await new Spider().run('https://example.com');
```

An Options object can be passed into the Spider when it's created to override its default behaviors.

``` javascript
const spider = new Spider({
  maxConcurrency: 2,                      // Run two headless browsers in parallel
  maxRequestsPerMinute: 60,               // Limit them to 1 request per second
  downloadMimeTypes: ['application/pdf'], // Download any PDF files encountered

  pageHandler: ({ page, saveResource, enqueueUrls }) => {
    // 'page' is the Playwright page object; you can use it to control
    // the browser, grab HTML snippets, take screenshots, and more.
    const html = await page.content();

    // Save metadata about the current page to the database, with the raw
    // page markup in the resource's "body" property
    await saveResource({ body: html })

    // Find URLs on the page, record them all in the database, and visit
    // any that match our target domain.
    await enqueueUrls();
  }
});

await spider.run('https://example.com');
```

## Why this thing?

Large-scale inventory and analysis of web content is kind of hellish. Most automated tools are focused on SEO, and assume that a spreadsheet of URLs is the desired endgame. On the other hand, most programmer-friendly web scraping toolkits are built to automate web APIs or extract specific bits of data from others' web sites. (Grabbing a list of every product in an Amazon category, extracting job listings, etc.)

[Autogram](https://autogram.is) often works with companies that are trying to get a handle on their own huge web ecosystems. We needed:

- Simple exploratory spidering, *and* complex conditional rules for normalizing and traversing large multi-site content ecosystems.
- The ability to preserve complex relationships between each page, *and* layer on additional information from other sources like internal client spreadsheets and CMS inventories, analytics APIs, etc.
- A solid framework for iterative analysis of that multi-layered data, not just a million-row spreadsheet and two weeks with Excel.

There are tons of useful programs, hosted services, and open source projects that do *some* of that, but finding anything that supported it all was a nightmare. Unforatunately, we're huge nerds, so we had to go build it.
