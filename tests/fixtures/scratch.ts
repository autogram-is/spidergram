import { ArangoStore } from '../../source/arango.js';
import { CheerioSpider } from '../../source/spider/cheerio/cheerio-spider.js';
import { ProcessOptions, processResources } from '../../source/analysis/index.js';
import { JsonObject } from '../../source/types.js';
import { log } from 'crawlee';

// Assorted parsing helpers
import { getMeta } from '../../source/analysis/index.js';
import { htmlToText } from 'html-to-text';
import readability from 'readability-scores';

// Sheets.js setup
import * as XLSX from 'xlsx';
import * as fs from 'fs';
XLSX.set_fs(fs);
import { Readable } from 'stream';
XLSX.stream.set_readable(Readable);
import { LinkSummaries } from '../../source/reports/link-summaries.js';
import { AqlQuery, aql } from 'arangojs/aql.js';
import { Database } from 'arangojs/database.js';
import { Listr } from 'listr2';

interface Ctx {
  project: string;
  targetDomain: string;
  storage: Database;
}

await new Listr<Ctx>([
  {
    title: 'Setup',
    task: async (ctx, task) => {
      ctx.targetDomain = await task.prompt({
        type: 'Text',
        message: 'Domains to crawl):',
        initial: 'example.com'
      });
      ctx.project = ctx.targetDomain.replace('.', '_')
      ctx.storage = await ArangoStore.open(ctx.project);
      task.title = `Crawling ${ctx.targetDomain}`;
    }
  },
  {
    title: 'Site crawl',
    task: async (ctx, task) => {
      log.setLevel(log.LEVELS.OFF);
      const spider = new CheerioSpider({
        storage: ctx.storage,
        autoscaledPoolOptions: {
          maxConcurrency: 5,
          maxTasksPerMinute: 360
        }
      });
      const c = await spider.run([`https://${ctx.targetDomain}`]);
      task.title = `${c.requestsFinished} requests processed, ${c.requestsFailed} failed, in ${c.requestTotalDurationMillis / 1000}s`;
      return Promise.resolve();
    }
  },
  {
    title: 'Post-processing',
    task: async (ctx, task) => {
      const filter = aql`FILTER resource.body != null`;
      const options:ProcessOptions = {
        metadata: resource => (resource.body) ? getMeta(resource.body) : undefined,
        text: resource => (resource.body) ? htmlToText(resource.body, { 
          baseElements: { selectors: ['main'] }
        }) : undefined,
        readability: resource => (resource.text) ? readability(resource.text as string) : undefined,
      }
      const processResults = await processResources(filter, options, ctx.storage);
      task.title = `Records processed, ${Object.keys(processResults.errors).length} errors.`;
      return Promise.resolve();
    }
  },
  {
    title: 'Report generation',
    task: async (ctx, task) => {
      const queries: Record<string, AqlQuery> = {
        'Pages': LinkSummaries.pages(),
        'Errors': LinkSummaries.errors(),
        'Malformed URLs': LinkSummaries.malformed(),
        'Non-Web URLs': LinkSummaries.excludeProtocol(),
        'External Links': LinkSummaries.outlinks([ctx.targetDomain])
      };
      const workbook = XLSX.utils.book_new();
      for (let key in queries) {
        const cursor = await ctx.storage.query(queries[key]);
        const result = (await cursor.all()).map(value => value as JsonObject);
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(result), key);
      }
      XLSX.writeFileXLSX(workbook, `storage/${ctx.targetDomain}.xlsx`);
      task.title = `${ctx.targetDomain}.xlsx generated.`;
      return Promise.resolve();
    }
  }
]).run();