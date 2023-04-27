# Spidergram's Data Model

- **UniqueUrls** and **Resources**: The core domain entities Spidergram uses to store crawled information. They represent discovered URLs (either from your configuration or discovered by parsing other pages).
- **RespondsWith** and **LinksTo**: The two key relationships populated during a default Spidergram crawl. They represent the relationship between a UniqueUrl and the Resource that it generates when visited; and the relationship between a Resource and *any* UniqueUrl that it links *to*.
- **Sites**, **Patterns**, **PatternAppearances,** and **Fragments**
- **IsChildOf**, **IsVariantOf**, and **AppearsOn**: Three additional relationship types that aren't populated during a default crawl, but can be used by post-crawl analysis tools to represent things like URL hierarchies, navigation hierarchies, alternate-language versions of a page, and sub-page components that are reused across many pages.
- **KeyValueStores** and **DataSets**

Custom document and relationship types can be added for project or domain-specific needs. A *Business Department* entity that connects to Resources via an *IsResponsibleFor* relationship, for example, might allow ownership information to be grafted onto the pool of Resources. A *Content* entity might track recurring instances of CMS entities that don't correspond 1:1 with a single page. Knock yourself out.
