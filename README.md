# Spidergram: Structural analysis tools for complex web sites

Spidergram is a toolbox for exploring, auditing, and analyzing complicated web sites — particularly ones that use multiple CMSs, span more than one domain, and are maintained by multiple teams inside an organization. Although it works well for smaller projects, Autogram built it to overcome the roadblocks we hit when using existing crawling and inventory tools on our clients' complex, multi-site web properties.

## Installation

1. Make sure you're running NodeJS 18 or higher
2. Install [ArangoDB community edition](https://www.arangodb.com/download-major/) server
3. `npm install @autogram/spidergram`
4. Nope, that's it.

## Usage

Import the 'Spider' class to your script, create an instance, and call the 'run' method. Without any other options, Spidergram will hit the URL you give it, save the contents to the database, search for other links *within the same domain*, and follow them until it's visited and saved everything it can find.

```
import { Spider } from '@autogram/spidergram';

// The absolute basics
await new Spider().run('https://example.com');
```

An Options object can be passed into the Spider when it's created to override its default behavior.
```
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

## All the other stuff

More docs are coming; it's a lot.