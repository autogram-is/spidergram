# Customizing Spidergram's settings

Spidergram ships with some sensible defaults for things like URL normalization and HTML parsing. Out of the box, it also assumes you're storing your data in a locally-installed copy of ArangoDB *without a password*

It will treat whatever directory you're in when you run the `spidergram` command as its current "project directory," and store its temp files, downloads, final report output, etc. there.

Getting the most out of Spidergram, however, means cracking open a settings file and customizing how it does its business.

## Config files and locations

When you run Spidergram from the command line, it will check the directory you're located in for a `spidergram.config.json` file; if it doesn't find anything there, it will also check to see if there's a dedicated `config` subdirectory. In addition, config files can be in `yaml` or `json5` format (JSON5 is a less-strict version of JSON that supports inline comments and reads more like Javascript code and less like an explosion in a quotation-mark factory).

If no config files are found, Spidergram will use its internal default settings for everything, including the connection to ArangoDB for data storage.

## Configuration options

Spidergram has a *lot* of internal settings that can be customized. We'll cover the basics here but more complete documentation on every intividual flag will be coming soon on a dedicated API documentation site.

## Global settings

| option | default | notes |
|---|---|---|
|storageDirectory|`<current-dir>/storage`||
|outputDirectory|`<current-dir>/output`||

| database option | default | notes |
|---|---|---|
|arango.url|`'http://127.0.0.1:8529'`||
|arango.databaseName|`'spidergram'`||
|arango.auth.username|`'root'`||
|arango.auth.password|`''`||

| url normalizer option | default | notes |
|---|---|---|
|normalizer.forceProtocol|`'https:'`||
|normalizer.forceLowercase|`'hostname'`||
|normalizer.discardSubdomain|`'ww*'`||
|normalizer.discardAnchor|`true`||
|normalizer.discardAuth|`true`||
|normalizer.discardIndex|`'**/{index,default}.{htm,html,aspx,php}'`||
|normalizer.discardSearch|`'!{page,p}'`||
|normalizer.sortSearchParams|`true`||

## Spider settings

| option | default | notes |
|---|---|---|
|spider.userAgent|`'Spidergram'`||
|spider.maxConcurrency|`1`|The number of headless browsers to run simultaneously|
|spider.maxRequestsPerMinute|`120`||
|spider.downloadMimeTypes|`[]`|An array of mime types to download for later parsing (`*` wildcards are supported)|
|spider.saveCookies|`true`|Save all set cookies for later parsing|
|spider.savePerformance|`true`|Save page loading and rendering data|

| url filter setting option | default | notes |
|---|---|---|
|spider.urls.selectors|`'a'`||
|spider.urls.save|`'all'`|Save links that match this criteria|
|spider.urls.crawl|`'same-domain'`|Visit and crawl links that match this criteria|
|spider.urls.discardNonWeb|`false`|Discard non-http/https links|
|spider.urls.discardUnparsable|`false`|Discard malformed or incomplete links|
|spider.urls.recursionThreshold|`3`|Do not follow links if a path segment repeats more than this many time (e.g., `example.com/directory/~/~/~/`|

## Page Analysis

| data extraction setting | default | notes |
|---|---|---|
|analysis.data.all|`false`||
|analysis.data.attributes|`true`|Parse HTML attributes on the `body` tag; these are often used to store pagewide settings and design options|
|analysis.data.meta|`true`|Pased meta tags, including keywords, OpenGraph data, etc.|
|analysis.data.json|`true`|Parse JSON data embedded in `script` tags|
|analysis.data.schemaOrg|`true`|Parse Schema.org information embedded as `JSON-LD` dta|
|analysis.data.links|`false`|Parse `link` tags|
|analysis.data.noscript|`false`|Parse `noscript` tags|
|analysis.data.scripts|`false`|Parse `script` tags|
|analysis.data.styles|`false`|Parse `style` tags|

| content analysis setting | default | notes |
|---|---|---|
|analysis.content.selector|`'body'`|CSS selector to use when extracting the page's core content|
|analysis.content.defaultToFullDocument|`false`|If the selector can't be found, fall back to the full page body|
|analysis.content.trim|`true`||
|analysis.content.readability|`true`|Calculate the core content's readability score|
|analysis.content.readability.formula|`'FleschKincaid'`||
|analysis.content.readability.stats|`true`|Collect additional stats like word and sentence count|

| general analysis setting | default | notes |
|---|---|---|
|analysis.tech|`true`|Scan each page for known web technologies|
|analysis.links|`false`|Rebuild each page's list of outbound links|
|analysis.site|`'parsed.hostname'`|The dot-notation path of a Page property to use as its "site name"|

## Complex analysis options

| setting | notes |
|---|---|
|analysis.properties||
|analysis.patterns||
|queries||
|reports||
