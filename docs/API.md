# Spidergram API

Spidergram was originally designed to be a "pure API;" its confiuration system and CLI commands were added later when it became clear just how much could be done without custom code. Although they accomplish a lot, creating your own NodeJS project and using Spidergram as an API can still be useful if you need:

- Complete control over how crawling and analysis tasks are performed
- Customized integration with third-party CLI tools and APIs during the analysis process
- New kinds of relationships or entities ('Business Units' or 'CMS Posts') in the data model
- Analysis of "app-like" web sites where users perform complex in-page tasks rather than simply following links

## Requirements

Spidegram requires NodeJS 18 or later; it's also a [pure ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) project. While there are still plenty of CommonJS projects out there, the ecosystem is quickly moving towards a consistent ESM standard. We bit the bullet now rather than migrating in the future as project dependencies leave CommonJS behind.

Although storing data requires a running ArangoDB instance to be accessible, some of Spidergram's APIs (in particular the parsing tools) can be used without persisting any documents to the Database.

## Spidergram Core

The `Spidergram` class is responsible for bootstrapping default settings, custom config files, and so on. Although you can use any of Spidergram's individual components without it (loading the Spider class and explicitly setting all of its config options before running it, for example), letting the central config manager keep track of things like your URL normalization and filtering rules in one place can save a lot of frustration.

To use it, just import the `Spidergram` class, call its static `load()` method, and await the returned Promise. Doing this at the beginning of any custom code that uses Spidergram's tools ensures that your global configuration is applied consistently.

``` javascript
import { Spidergram } from 'spidergram';
await Spidergram.load();
```

## Saving and Querying Data

TBD; the `Query` class can do quite a bit of heavy lifting and the `Spidergram` global configuration has an `arango` property that gives you access to a straight ArangoDB connection where documents can be saved, loaded, etc.

## The Spider Class

In a node.js project, import and create an instance of the 'Spider' class. Call its `run()` method, passing in one or more URLs — without any other options, Spidergram will hit those URLs, save their contents to the database, search for other links *within the same domain*, and follow them until it's visited and saved everything it can find.

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

The Spider class is an event emitter; to monitor its progress, you can subscribe to its progress and end events:

``` javascript
const spider = new Spider({ ...options });
spider.on('progress', (status, url) => { console.log(`Crawled ${url}`); })
spider.on('end', () => { console.log('Crawl complete!'); });
await spider.run('https://example.com');
```

## URL Wrangling Tools

## Parsing Tools

## Custom CLI Commands
