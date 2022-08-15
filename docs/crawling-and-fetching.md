# Crawling and Fetching
Spidergram's crawling and fetching process is designed to be customized in several ways; an external application or script is expected to provide it with an already-instantiated instance of the `Graph` class to handle persistence, as well as a configuration object with a variety of `UrlFilter` and `ResourceFilter` instances to control its decisions during the crawl.

`Crawler` classes _may_ check the graph for existing uncrawled URLs, but they don't _have_ to. They can also rely entirely on incoming URL lists from the controlling application or script.

Once they have one or more URLs in hand, they take on responsibility for calling one or more `Fetcher` class. The Fetcher is expected to take in a UniqueUrl record and return a Status or Resource object, and a RespondsWith relationship connecting the Status/Resource to the original UniqueUrl. A Fetcher _may_ also return additional graph entities but should _not_ do extra discovery and parsing work that's naturally the domain of the `Crawler`.

When this is finished the `Crawler` hands all of the discovered entities back to the controlling app/script, which is responsible for persisting the entities.

## Crawl Entities

```mermaid
erDiagram
  UniqueUrl |o--|{ Status : RespondsWith
  UniqueUrl |o--o{ Resource : RespondsWith
  Resource }o--o{ UniqueUrl : LinksTo
  Resource }o--o| Resource : IsVariantOf
  Resource }o--o| Resource : IsChildOf
```

- Nodes
  - **UniqueUrl**: A normalized URL that was pre-loaded before the crawl began, or discovered by parsing retrieved resources during the crawl.
  - **Status**: A stub resource containing only the RespondsHeaders for a URL request. We use these to note that a given URL was broken when we requested it, or to gather information on URLs we encounter but don't want to fully crawl.
  - **Resource**: The information retrieved by a full web request. These are usually HTML, but could be binary files. If the crawl is configured to download linked files, they'll be saved to the filesystem and the filepath saved to the Resource. HTML is saved straight into the Resource node itself.
- Edges/Relationships
  - **RespondsWith**: Connects a UniqueUrl to a Status or a Resource. The request headers we sent when we checked the URL are saved here, in case we need to recall them later.
  - **LinksTo**: Connects a Resource that’s been parsed for links to the UniqueUrls that it references. The context in which the link occurred (page section, HTML tag attributes, etc) is saved here, so we can find and filter resources by where links to them appear in other resources.
  - **IsChildOf**: Used to construct Resource hierarchies; multiple hierarchies can be created and distinguished from each other by adding tags to it.
  - **IsVariantOf**: Resources that serve as filtered, localized, or personalized versions of another Resource. These can be used to filter out variants when constructing hierarchy maps, or to group variations for aggregate analysis.

## Crawl/Analysis Flow
```mermaid
sequenceDiagram
  autonumber
  Actor A as Application
  participant S as Dispatcher 
  participant F as Fetcher
  participant P as Plugins
  participant G as Graph

  links S: {"Github": "https://github.com/autogram-is/spidergram/blob/main/src/spider.ts"}
  links G: {"Github": "https://github.com/autogram-is/node-simple-graph"}
  links F: {"HTTP Fetcher": "https://github.com/autogram-is/spidergram/blob/main/src/http/got-fetcher.ts"}
  links P: {"Link Extractor": "https://github.com/autogram-is/spidergram/blob/main/src/extractors/resource-extractors.ts"}
  links P: {"URL Filters": "https://github.com/autogram-is/url-tools/blob/main/src/filters.ts"}
  links P: {"Response Filters": "https://github.com/autogram-is/spidergram/blob/main/src/http/response-filter.ts"}

  A->>+S: Setup!
  S->>+G: Setup!
  deactivate G
  S-->>A: Ready!

  loop Import/Populate
  rect rgba(0, 0, 0, .05)
  A->>S: URLs
  S->>+P: URLs
  P->>-S: Normalized Unique URLs
  S->>S: Create Entities
  S->>+G: URLs
  deactivate G
  end
  end

  A->>S: Begin Crawl

  loop Fetch/Discover
  rect rgba(0, 0, 0, .05)
  S->>+G: Next URL?
  G->>-S: URL
  S->>+F: URL
  F->>+P: HTTP Data
  P->>-F: Proceed/Discard
  F->>-S:Response or Status
  S->>+P: Response
  P->>-S: Extracted Data
  S->>S: Create Entities
  S->>+G: Save Data
  deactivate G
  S-->>A: Progress Update
  end
  end

  S-->>-A: Complete
  
  loop Analyze
  rect rgba(0, 0, 0, .05)
  A->>+G: Queries
  G->>-A: Entities
  A->>+P: Entities
  P->>-A: Extracted Data
  A->>A: Update, Create Entities
  A->>+G: Save Entities
  deactivate G
  end
  end
```


## Detailed view of the Crawl Flow

```mermaid
sequenceDiagram
  autonumber
  Actor A as Application
  participant D as Dispatcher
  participant Q as Queue
  participant F as Fetcher
  participant P as Plugins
  participant G as Graph
  participant R as Remote Server

  A->>+D: Start Crawl
  D->>+Q: Setup
  D->>+G:Untag all URLs marked as Queued
  deactivate G

  activate D

  loop Until no more uncrawled, untagged URLs

  rect rgba(0, 0, 0, .05)
  Q->>D:Queue is Empty
  D->>+G: Get uncrawled, unqueued URLs
  G->>D: URL
  D->>G:Tag URL as Queued
  deactivate G
  D->>+F: URL
  F->>-D: Promise
  D->>-Q: Promise
  end

  Q-->>Q: Monitor Concurrency Limit
  Q->>+F: URL from Promise

  rect rgba(0, 0, 0, .05)

    F->>+P:Check or Retrieve?
    P->>-F: Decision

    F->>+R:Open Stream
    alt Error thrown
      F->>F:Create Status
      F->>Q:Error Status
    else Response Received
      R->>F:Headers
    end

    F->>+P: Headers
    P->>-F: Decision

    alt Bad Status
      F->>F:Create Status
      F->>Q:Error Status
    else HTML/XML Content-Type
      F->>F:Create Resource
      R->>F:Stream data to string
    else Downloadable Content-Type
      F->>F:Create Resource
      F->>+P:Response Object
      P->>P:Name & create file(s)
      R->>P:Stream data to file
      P-->>-F:Filenames
    end
    R-->-F: Close stream
    F->>-Q:Resource
  end
    Q->>+D:Entities

    rect rgba(0, 0, 0, .05)
    D->>+P:Resource
    P->>-D:Extracted Data
    D->>D:Create UniqueUrls, LinkTos
    D->>+G:Check Duplicates
    D->>G:Save Entities
    deactivate G
    D->>A:Progress Update

    deactivate D
  end
  G-->>D: No uncrawled URLs
  end

  D->>-A:Progress Update

```