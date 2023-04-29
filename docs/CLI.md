# Spidergram Command Line Tools

When it's installed globally, Spidergram exposes a `spidergram` command you can use from your command line. Running it with no additional parameters (or with the `--help` flag) lists its different sub-commands.

```markdown
help        Display help for spidergram.
init        Configure a new Spidergram project
status      Settings and stats for the current project
cleanup     A grab bag of disk and database tidying

go          Crawl and analyze a site, then generate a report.
crawl       Crawl and store a site
analyze     Analyze the contents of a crawl
query       Run a query against the crawl data
report      Build and save a crawl report

ping        Examine any page with the current analyzer settings
screenshot  Save screenshots of pages and page elements
url test    Test a URL with the current normalizer
url tree    Build a tree from a list of URLs
```
