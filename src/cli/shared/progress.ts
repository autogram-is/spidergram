export * as progress from 'cli-progress';

// Stubbed placeholder for shared utilities. We want:
// 1. A default progress bar implementation that accepts a 
//    spidergram crawl/task/whatever Status object and automatically
//    self updates from it, without any other wrapper or helper code
// 2. A progress bar implementation that returns the bar as a string
//    for use in Listr2 updates or constructed status panels
// 3. An advanced status display that can show result breakdowns
//    like the retryHistogram from Crawlee, and the resultsByMimeType
//    list from Spider, in addition to the progress bar.
