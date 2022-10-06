import {
  CheerioCrawler,
  CheerioCrawlerOptions,
  CheerioCrawlingContext,
  CheerioCrawlerEnqueueLinksOptions,
  FinalStatistics
} from "crawlee";
import { SpiderConfiguration } from "./config.js";

export interface CheerioSpiderOptions extends CheerioCrawlerOptions {
  
}

export interface CheerioSpiderContext extends CheerioCrawlingContext {
  
}

export interface CheerioSpiderEnqueueLinksOptions extends CheerioCrawlerEnqueueLinksOptions {
  
}

export class CheerioSpider extends CheerioCrawler {
  constructor(options?: CheerioSpiderOptions, config?: SpiderConfiguration) {
    // build our custom 'wrapper' routers 
    super(options, config);
  }


    /**
     * Runs the crawler. Returns a promise that gets resolved once all the requests are processed.
     * Unlike the built-in crawlers, we require a call to  {@apilink BasicCrawler.addRequests|`crawler.addRequests()`}
     * before {@apilink BasicCrawler.run|`crawler.run()`}; this makes it easier to inercept link
     * enqueueing and request-building functionality to add our Spidergram sauce.
     */
    override run(): Promise<FinalStatistics> {
      return super.run();
    }

}