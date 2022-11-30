# Spidergram: Structural analysis tools for complex web sites

Spidergram is a toolbox for exploring, auditing, and analyzing complicated web sites — particularly ones that use multiple CMSs, span more than one domain, and are maintained by multiple teams inside an organization. Although it works well for smaller projects, Autogram built it to overcome the roadblocks we hit when using existing crawling and inventory tools on our clients' complex, multi-site web properties.

## Installation

1. Make sure you're running NodeJS 18 or higher
2. Install [ArangoDB community edition](https://www.arangodb.com/download-major/) server
3. `npm install spidergram`

## Usage

```import { Spider } from 'spidergram';
await new Spider().run('https://example.com');```

Import the 'Spider' class to your script, create an instance, and call the 'run' method. Without any other options, Spidergram will hit the URL you give it, save the contents to the database, search for other links *within the same domain*, and follow them until it's visited and saved everything it can find.

An Options object can be passed into the Spider when it's created to override its default behavior.

```const spider = new Spider({
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

await spider.run('https://example.com');```

## The Spidergram CLI

Installing Spidergram globally (`npm install -g spidergram`) will give you access to its command line interface; `spidergram --help` will list the available commands. Kicking off a new crawl, exporting simple reports, and checking on the status of the database can all be done from the CLI, and custom projects that use Spidergram can add their own commands to the mix.

## Analyzing the results

Spidergram comes with a handful of canned queries and reports that can be run against most crawls (HTTP errors, lists of downloadable files vs HTML pages, etc); the `spidergram-boilerplate` project is a quick, customizable starting point for experimentation with examples of custom crawl rules and spreadsheet-based reports. We'll be adding a tool to automatically generate a new Spidergram-based project shortly: once that's in place, `npx spidergram generate mySpiderProject` will automate the initial steps.

## All the other stuff

Spidergram provides a pile of helper methods to extract structured data from pages, capture organizational relationships like navigation hierarchy, and record subtle connections like "page A is a french translation of page B." Documentation and more examples are coming shortly.
