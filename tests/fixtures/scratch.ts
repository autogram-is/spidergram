import {log} from 'crawlee';
import {htmlToText} from 'html-to-text';
import readability from 'readability-scores';
import {AqlQuery, aql} from 'arangojs/aql.js';
import {Listr} from 'listr2';
import {ArangoStore} from '../../source/arango-store.js';
import {PlaywrightSpider} from '../../source/spider/index.js';
import {ProcessOptions, processResources} from '../../source/analysis/index.js';
import {Spreadsheet, RowData} from '../../source/spreadsheet.js';

// Assorted parsing helpers
import {getMeta} from '../../source/analysis/index.js';
import {UrlHierarchy} from '../../source/analysis/hierarchy/url-hierarchy.js';

import {LinkSummaries} from '../../source/reports/link-summaries.js';

interface Ctx {
  project: string;
  targetDomain: string;
  storage: ArangoStore;
}

log.setLevel(log.LEVELS.ERROR);

await new Listr<Ctx>([
  {
    title: 'Setup',
    async task(ctx, task) {
      ctx.targetDomain = await task.prompt({
        type: 'Text',
        message: 'Target domain:',
        initial: 'example.com',
      });
      ctx.project = ctx.targetDomain.replace('.', '_');
      ctx.storage = await ArangoStore.open(ctx.project);
      task.title = `Analyzing ${ctx.targetDomain}`;
    },
  },
  {
    title: 'Site crawl',
    enabled: true,
    async task(ctx, task) {
      const spider = new PlaywrightSpider({
        storage: ctx.storage,
        errorHandler(ctx, error) {
          console.log(error);
        },
        autoscaledPoolOptions: {
          maxConcurrency: 5,
          maxTasksPerMinute: 360,
        },
      });
      const c = await spider.run([`https://${ctx.targetDomain}`]);
      task.title = `${c.requestsFinished} requests processed, ${c.requestsFailed} failed, in ${c.requestTotalDurationMillis / 1000}s`;
    },
  },
  {
    title: 'Post-processing',
    async task(ctx, task) {
      const filter = aql`FILTER resource.body != ''`;
      const options: ProcessOptions = {
        metadata: resource => (resource.body) ? getMeta(resource.body) : undefined,
        text: resource => (resource.body) ? htmlToText(resource.body, {
          baseElements: {selectors: ['main']},
        }) : undefined,
        readability: resource => (resource.text) ? readability(resource.text as string) : undefined,
        template(resource) {
          const classes = resource.get('metadata.body.class') as string[] | undefined;
          if (classes !== undefined) {
            return classes.find(cls => cls.startsWith('tmpl-'))?.replace('tmpl-', '') ?? '';
          }

          return '';
        },
        section(resource) {
          const classes = resource.get('metadata.body.class') as string[] | undefined;
          if (classes !== undefined) {
            return classes.find(cls => cls.startsWith('sect-'))?.replace('sect-', '') ?? '';
          }

          return '';
        },
        date(resource, root) {
          if (root === undefined) {
            return '';
          }

          return root('aside.page-meta time').attr('datetime')?.toString() ?? '';
        },
      };
      const processResults = await processResources(filter, options, ctx.storage);
      task.title = `Records processed, ${Object.keys(processResults.errors).length} errors.`;
    },
  },
  {
    title: 'URL Tree mapping',
    async task(ctx, task) {
      await ctx.storage.collection('is_child_of').truncate();
      const urlHier = new UrlHierarchy(ctx.storage);
      const query = aql`FILTER uu.parsed.domain == 'ethanmarcotte.com'`;
      return urlHier.loadPool(query)
        .then(async () => urlHier.buildRelationships())
        .then(async () => urlHier.save());
    },
  },
  {
    title: 'Report generation',
    async task(ctx, task) {
      const queries: Record<string, AqlQuery> = {
        Pages: LinkSummaries.pages(),
        Errors: LinkSummaries.errors(),
        'Malformed URLs': LinkSummaries.malformed(),
        'Non-Web URLs': LinkSummaries.excludeProtocol(),
        'External Links': LinkSummaries.outlinks([ctx.targetDomain]),
      };

      const report = new Spreadsheet();
      for (const name in queries) {
        await ctx.storage.query<RowData>(queries[name])
          .then(async cursor => cursor.all())
          .then(result => {
            report.addSheet(result, name);
          });
      }

      return report.save(`storage/${ctx.targetDomain}`)
        .then(fileName => {
          task.title = `${fileName} generated.`;
        });
    },
  },
]).run();
