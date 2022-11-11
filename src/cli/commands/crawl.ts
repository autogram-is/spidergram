import { Flags } from '@oclif/core';
import is from '@sindresorhus/is';
import {
  Spider,
  HtmlTools,
  TextTools,
  SpiderStatistics,
  EnqueueUrlOptions,
} from '../../index.js';
import { CLI, SpidergramCommand } from '../index.js';

export default class Crawl extends SpidergramCommand {
  static summary = 'Crawl and store a site';

  static usage = '<%= config.bin %> <%= command.id %> <urls>'

  static examples = [
    '<%= config.bin %> <%= command.id %> example.com',
    '<%= config.bin %> <%= command.id %> --body="section.main" --download="application/pdf" https://example.com',
  ];

  static flags = {
    ...CLI.globalFlags,
    erase: Flags.boolean({
      description: 'Erase existing database before crawling'
    }),
    ...CLI.crawlFlags
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
    const {project, graph, errors} = await this.getProjectContext();

    if (errors.length > 0) {
      for (let error of errors) {
        if (is.error(error)) this.ux.error(error);
      }
    }

    let urls: string[] = [];

    if (is.emptyArray(argv)) {
      const stdin = await this.stdin();
      if (is.undefined(stdin)) {
        this.ux.error('No URLs were provided.');
      } else {
        urls = stdin.match(/[\n\s]+/) ?? [];
      }
    } else {
      urls = argv;
    }

    if (flags.erase) {
      const confirmation = await CLI.confirm(`Erase the ${project.name} database before crawling`);
      if (confirmation) {
        await graph.erase({ eraseAll: true });
        this.log(`${project.name} database cleared for crawl.`)
      }
    }

    const progress = new CLI.progress.Bar({hideCursor: true}, CLI.progress.Presets.shades_grey);

    const spider = new Spider({
      logLevel: 0,
      downloadMimeTypes: flags.download,
      async pageHandler(context) {
        const {$, saveResource, enqueueUrls} = context;
        const body = $!.html();

        if (flags.metadata) {
          const meta = HtmlTools.getMetadata($!);
          const text = HtmlTools.getPlainText(body, {
            baseElements: {selectors: flags.body},
          });
          const readability = TextTools.calculateReadability(text);
          await saveResource({body, meta, text, readability});
        } else {
          await saveResource({body});
        }
        
        const urlOptions: Partial<EnqueueUrlOptions> = {};
        if (flags.discover !== 'none') {
          urlOptions.save = flags.discover;
          urlOptions.enqueue = (flags.enqueue === 'none') ? () => false : flags.enqueue;
          await enqueueUrls(urlOptions);
        }
      },
    });

    spider.on('requestComplete', (stats: SpiderStatistics) => {
      progress.setTotal(stats.requestsEnqueued);
      progress.update(stats.requestsCompleted);
    });
    
    progress.start(
      (await spider.getRequestQueue()).assumedTotalCount,
      (await spider.getRequestQueue()).assumedHandledCount,
    );

    await spider.run(urls).then(summary => { 
      progress.update({ total: summary.requestsEnqueued, value: summary.requestsCompleted });
      progress.stop();
      this.summarizeResults(summary);
    });
  }

  summarizeResults(stats: SpiderStatistics) {
    this.log();
    this.ux.styledJSON(stats);
    this.ux.styledHeader('Crawl complete.');
  }
}
