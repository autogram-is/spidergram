import { SpidergramCommand } from '../index.js';
import { Flags } from '@oclif/core';
import {
  Spider,
  HtmlTools,
  TextTools,
  SpiderStatistics,
} from '../../index.js';
import * as Progress from 'cli-progress';

export default class Crawl extends SpidergramCommand {
  static description = 'Crawl and store a site';

  static usage = '<%= config.bin %> <%= command.id %> --analyze --body=[css selector] <url>'

  static examples = [
    '<%= config.bin %> <%= command.id %> example.com',
    '<%= config.bin %> <%= command.id %> --config="custom.json" example.com',
    '<%= config.bin %> <%= command.id %> --analyze https://example.com',
    '<%= config.bin %> <%= command.id %> --analyze --body="section.main" https://example.com',
  ];

  static flags = {
    config: SpidergramCommand.globalFlags.config,
    erase: Flags.boolean({
      char: 'e',
      description: 'Erase existing data before crawling'
    }),
    analyze: Flags.boolean({
      char: 'a',
      description: 'Extract metadata and page contents'
    }),
    body: Flags.string({
      char: 'b',
      description: 'CSS selector for main page text',
      default: ['body'],
      dependsOn: ['analyze'],
      multiple: true
    })
  }

  static args = [
    {
      name: 'urls',
      description: 'One or more URLs to crawl',
      required: true
    },
  ];

  static strict = false
  
  async run() {
    const {argv, flags} = await this.parse(Crawl);

    if (flags.erase) {
      const confirmation = await this.confirm(`Erase the ${this.project.name} database before crawling`);
      if (confirmation) {
        await this.project.graph.erase({ eraseAll: true });
        this.log(`${this.project.name} database cleared for crawl.`)
      }
    }

    this.ux.styledHeader(`Crawling...`);
    const progress = new Progress.SingleBar({
      hideCursor: true
    }, Progress.Presets.shades_grey);

    progress.start(1, 0);

    const spider = new Spider({
      logLevel: 0,
      async pageHandler(context) {
        const {$, saveResource, enqueueLinks} = context;
        const body = $!.html();

        if (flags.analyze) {
          const meta = HtmlTools.getMetadata($!);
          const text = HtmlTools.getPlainText(body, {
            baseElements: {selectors: flags.body},
          });
          const readability = TextTools.calculateReadability(text);
          await saveResource({body, meta, text, readability});
        } else {
          await saveResource({body});
        }
        
        await enqueueLinks();
      },
    });

    spider.on('requestComplete', (stats: SpiderStatistics) => {
      progress.setTotal(stats.requestsEnqueued);
      progress.update(stats.requestsCompleted);
    });
    
    await spider.run(this.sanitizeUrls(argv)).then(summary => { 
      progress.stop();
      this.summarizeResults(summary);
    });
  }

  // This is suuuuuper ugly, but it properly catches URLs with no protocol.
  sanitizeUrls(urls: string[]): string[] {
    return urls.map(url => {
      if (url.toLowerCase().startsWith('http')) return url;
      return 'https://' + url;
    });
  }

  summarizeResults(stats: SpiderStatistics) {
    this.ux.styledHeader('Crawl complete.');
    this.ux.styledJSON(stats);
  }
}

