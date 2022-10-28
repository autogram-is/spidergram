import * as fs from 'node:fs';
import {Readable} from 'node:stream';
import {log} from 'crawlee';
import {htmlToText} from 'html-to-text';
import readability from 'readability-scores';
import * as XLSX from 'xlsx';
import {AqlQuery, aql} from 'arangojs/aql.js';
import {Listr} from 'listr2';
import {JsonObject} from 'type-fest';
import {ArangoStore} from '../../source/services/arango-store.js';
import {CheerioSpider} from '../../source/spider/cheerio-spider.js';

// Assorted parsing helpers
import {ProcessOptions, processResources, getMeta} from '../../source/analysis/index.js';

// Sheets.js setup
import {LinkSummaries} from '../../source/reports/link-summaries.js';

XLSX.set_fs(fs);
XLSX.stream.set_readable(Readable);

interface Ctx {
  project: string;
  targetDomain: string;
  storage: ArangoStore;
}

log.setLevel(log.LEVELS.OFF);

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
      task.title = `Crawling ${ctx.targetDomain}`;
    },
  },
  {
    title: 'Site crawl',
    async task(ctx, task) {
      const spider = new CheerioSpider({
        storage: ctx.storage,
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
      const filter = aql`FILTER resource.body != null`;
      const options: ProcessOptions = {
        metadata: resource => (resource.body) ? getMeta(resource.body) : undefined,
        text: resource => (resource.body) ? htmlToText(resource.body, {
          baseElements: {selectors: ['section#content']},
        }) : undefined,
        readability: resource => (resource.text) ? readability(resource.text as string) : undefined,
      };
      const processResults = await processResources(filter, options, ctx.storage);
      task.title = `Records processed, ${Object.keys(processResults.errors).length} errors.`;
    },
  },
  {
    title: 'Report generation',
    async task(ctx, task) {
      const queries: Record<string, AqlQuery> = {
        'Pages': LinkSummaries.pages(),
        'Errors': LinkSummaries.errors(),
        'Malformed URLs': LinkSummaries.malformed(),
        'Non-Web URLs': LinkSummaries.excludeProtocol(),
        'External Links': LinkSummaries.outlinks([ctx.targetDomain]),
      };
      const workbook = XLSX.utils.book_new();
      for (const key in queries) {
        const cursor = await ctx.storage.query(queries[key]);
        const result = (await cursor.all()).map(value => value as JsonObject);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(result), key);
      }

      XLSX.writeFileXLSX(workbook, `storage/${ctx.targetDomain}.xlsx`);
      task.title = `${ctx.targetDomain}.xlsx generated.`;
    },
  },
]).run();
