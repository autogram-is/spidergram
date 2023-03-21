import { Args } from '@oclif/core';
import {
  CLI,
  Spidergram,
  SgCommand,
  Resource,
  analyzePage,
} from '../../index.js';
import { SpiderCli } from '../shared/spider-cli.js';
import { launchPlaywright } from 'crawlee';
import { formatAxeReport, getAxeReport } from '../../tools/browser/get-axe-report.js';

export default class Probe extends SgCommand {
  static summary = 'Probe a web page with the current configured analyzer settings.';

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
    const { args } = await this.parse(Probe);

    this.ux.action.start('Fetching page');

    const browser = await launchPlaywright();
    const page = await browser.newPage();
    const response = await page.goto(args.url.toString()) ?? undefined;

    const body = await page.content();

    const cookies = sg.config.spider?.saveCookies
      ? (await page.context().cookies()).map(
          cookie => Object.fromEntries(Object.entries(cookie))
        )
      : [];

    const accessibility = sg.config.spider?.auditAccessibility
      ? await getAxeReport(page).then(results =>
            sg.config.spider?.auditAccessibility === 'summary'
            ? formatAxeReport(results)
            : results,
        )
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
        accessibility
      });

      await analyzePage(resource);

      this.displaySummary(resource);
    }
  }

  displaySummary(r: Resource) {
    const c = new SpiderCli();
    const overview: Record<string, number | string | string[]> = {
      Title: r.get('data.title') as string | undefined ?? '',
      URL: r.url,
      Status: r.code,
      Type: r.mime ?? 'unknown',
      'Body classes': r.get('data.attributes.classes') as string[] | undefined ?? '',
    };

    this.log(c.header('Overview'));
    this.ux.info(CLI.infoList(overview));

    this.log(c.header('Page Content'));
    this.ux.info(CLI.infoList((r.get('content.readability') ?? {}) as Record<string, number>));

    this.log(c.header('Accessibility Issues'));
    this.ux.info(CLI.infoList((r.accessibility ?? {}) as Record<string, number>));

    this.log(c.header('Detected Technologies'));
    const detected = r.get('tech' ?? []) as Array<Record<string, string[]>>;
    const tech: Record<string, number | string | string[]> = {};
    for (const t of detected) {
      const label = `${t.name}${t.version ? ' ' + t.version : ''}`;
      tech[label] = t.categories;
    }
    this.ux.info(CLI.infoList(tech));
  }
}

