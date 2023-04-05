import { Args } from '@oclif/core';
import {
  CLI,
  Spidergram,
  SgCommand,
  Resource,
  GraphTools,
  BrowserTools,
} from '../../index.js';
import { SpiderCli } from '../shared/spider-cli.js';
import { launchPlaywright } from 'crawlee';
import { AxeAuditor } from '../../tools/browser/axe-auditor.js';

export default class Ping extends SgCommand {
  static summary = 'Examine a page with the current analyzer settings';

  static usage = '<%= config.bin %> <%= command.id %> [url]';

  static flags = {};

  static args = {
    url: Args.url({
      description: 'A valid URL to analyze',
      required: true,
    }),
  };

  static strict = false;

  async run() {
    const sg = await Spidergram.load();
    const { args } = await this.parse(Ping);

    this.ux.action.start(`Fetching ${args.url.toString()}`);

    const browser = await launchPlaywright();
    const page = await browser.newPage();
    const response = (await page.goto(args.url.toString())) ?? undefined;

    const body = await page.content();

    const cookies = sg.config.spider?.saveCookies
      ? (await page.context().cookies()).map(cookie =>
          Object.fromEntries(Object.entries(cookie)),
        )
      : [];

    const accessibility = sg.config.spider?.auditAccessibility
      ? await AxeAuditor.run(page).then(results =>
          sg.config.spider?.auditAccessibility === 'summary'
            ? AxeAuditor.totalByImpact(results)
            : results,
        )
      : undefined;

    const timing = sg.config.spider?.savePerformance
      ? await BrowserTools.getPageTiming(page)
      : undefined;
  
    const xhr = sg.config.spider?.saveXhrList
      ? await BrowserTools.getXhrList(page)
      : undefined;
  
    await page.close();
    await browser.close();

    this.ux.action.stop();

    if (response === undefined) {
      this.ux.error('No response from the server.');
    } else {
      const resource = new Resource({
        url: response.url(),
        code: response.status(),
        message: response.statusText(),
        headers: response.headers(),
        size: Number.parseInt(response.headers()['content-length']),
        mime: response.headers()['content-type'],
        body,
        cookies,
        accessibility,
        timing,
        xhr
      });

      await GraphTools.analyzePage(resource);

      this.displaySummary(resource);
    }
  }

  displaySummary(r: Resource) {
    const c = new SpiderCli();
    const overview: Record<string, number | string | string[]> = {
      Title: (r.get('data.title') as string | undefined) ?? '',
      URL: r.url,
      Status: r.code,
      Type: r.mime ?? 'unknown',
      'Body classes': (r.get('data.attributes.classes') as string[] | undefined) ?? '',
      Cookies: r.cookies?.length ?? 0,
    };
    this.log(c.header('Overview'));
    this.ux.info(CLI.infoList(overview));

    const structuredData: Record<string, string> = {
      OpenGraph: r.get('data.meta.og') === undefined ? this.chalk.red('missing') : this.chalk.greenBright('present'),
      Twitter: r.get('data.meta.twitter') === undefined ? this.chalk.red('missing') : this.chalk.greenBright('present'),
      'Schema.org': r.get('data.schemaOrg') === undefined ? this.chalk.red('missing') : this.chalk.greenBright('present'),
    }
    this.log(c.header('Structured Data'));
    this.ux.info(CLI.infoList(structuredData));

    const readability = r.get('content.readability', {}) as Record<
      string,
      number | string
    >;
    if (Object.keys(readability).length > 0) {
      this.log(c.header('Page Content'));
      this.ux.info(CLI.infoList(readability));
    }

    const violations = r.get('accessibility', {}) as Record<string, number>;
    if (Object.keys(violations).length > 0) {
      this.log(c.header('Accessibility Issues'));
      this.ux.info(CLI.infoList(violations));
    }

    const detected = r.get('tech' ?? {}) as Record<string, string | string[]>;
    if (Object.keys(detected).length > 0) {
      this.log(c.header('Detected Technologies'));
      this.ux.info(CLI.infoList(detected, { sort: true }));
    }
  }
}
