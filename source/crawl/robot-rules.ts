import { URL } from 'node:url';
import robotsParser from 'robots-txt-parser';
import is from '@sindresorhus/is';
import { ParsedUrl } from '@autogram/url-tools';
import { Resource } from '../graph/index.js';

export class RobotRules {
  parser = robotsParser({ allowOnNeutral: true });

  // The Resources are assumed to have robots.txt body content.
  populateFrom(input: Resource[]): void {
    for (const r of input) {
      if (is.nonEmptyStringAndNotWhitespace(r.body)) {
        const host = new URL(r.url).hostname;
        this.parser.parseRobots(host, r.body);
      }
    }
  }

  getSitemaps(): string[] {
    return this.parser.getSitemapsSync();
  }

  isAllowedByRobotsTxt(url: ParsedUrl): boolean {
    return this.parser.canCrawlSync(url.href);
  }
}
