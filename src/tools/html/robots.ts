import robotsParser, { Robot } from 'robots-parser';

/**
 * Maintains a collection of Robot Exclusion rules for each site encountered
 * during a crawl.
 */
export class Robots {
  protected static _rules: Map<string, Robot>;

  protected static getHost(url: string | URL): string {
    const parsed = typeof url === 'string' ? new URL(url) : url;
    return parsed.hostname;
  }

  static get rules(): Map<string, Robot> {
    if (Robots._rules === undefined) {
      Robots._rules = new Map<string, Robot>();
    }

    return Robots._rules;
  }

  static setRules(url: string | URL, rules: string) {
    const robot = robotsParser(url.toString(), rules);
    Robots.rules.set(Robots.getHost(url), robot);
  }

  static getRules(url: string | URL) {
    const host = Robots.getHost(url);
    return Robots.rules.get(host);
  }

  static isAllowed(url: string | URL, ua?: string): boolean | undefined {
    const rules = Robots.getRules(url);
    return rules?.isAllowed(url.toString(), ua);
  }

  static isDisallowed(url: string, ua?: string): boolean | undefined {
    const rules = Robots.getRules(url);
    return rules?.isDisallowed(url.toString(), ua);
  }

  static getCrawlDelay(url: string | URL, ua?: string): number | undefined {
    const rules = Robots.getRules(url);
    return rules?.getCrawlDelay(ua);
  }

  static getSitemaps(url?: string | URL): string[] {
    let sitemaps: string[] = [];
    if (url) {
      const robot = Robots.getRules(url);
      sitemaps = robot?.getSitemaps() ?? [];
    } else {
      for (const r of Robots.rules.values()) {
        sitemaps.push(...r.getSitemaps());
      }
    }
    return sitemaps;
  }

  static getPreferredHost(url: string | URL): string | undefined {
    const rules = Robots.getRules(url);
    return rules?.getPreferredHost() ?? undefined;
  }

  private constructor() {
    throw new Error('Robots instances should not be used.');
  }
}
