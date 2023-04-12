import { Spidergram } from './spidergram.js';
import { SpiderOptions, Query, Report, ReportConfig } from '../index.js';
import { UrlMutators } from '@autogram/url-tools';
import { NormalizerOptions } from './global-normalizer.js';
import {
  HtmlToTextOptions,
  PageContentExtractor,
  PageContentOptions,
  PageDataExtractor,
  PageDataOptions,
} from '../tools/html/index.js';
import {
  PageAnalysisOptions,
  PageAnalyzer,
} from '../tools/graph/analyze-page.js';
import { TechAuditOptions } from '../tools/browser/index.js';
import { Configuration as FileConfiguration } from 'typefs';
import { Config as ArangoConfig } from 'arangojs/connection';
import { LoggerOptions } from 'caterpillar';
import { AqQuery } from 'aql-builder';
import { GeneratedAqlQuery } from 'arangojs/aql';
import {
  Configuration as CrawleeConfig,
  ConfigurationOptions as CrawleeConfigOptions,
} from 'crawlee';
import { SpiderCli } from '../cli/shared/index.js';

/**
 * Global configuration settings for Spidergram and its key components. Many of these
 * settings support "plain vanilla" JSON values, as well as richer settings values
 * like inline functions and class instances. This allows JSON based configuration
 * files to control Spidergram settings in most cases, whhile .js or .ts config scripts
 * get more precise contextual control.
 */
export interface SpidergramConfig extends Record<string, unknown> {
  /**
   * A global flag that can be used to control performance monitoring and other
   * non-production behaviors. Can be overidden by setting the SPIDERGRAM_DEBUG
   * environment variable.
   *
   * @defaultValue: `false`
   */
  debug?: boolean;

  logToConsole?: boolean;

  logToDatabase?: boolean | string;

  /**
   * The default level of log message Spidergram will process or display.
   * Can be overidden by setting the SPIDERGRAM_LOG_LEVEL environment
   * variable. Setting the log level to -1 disables logging entirely.
   *
   * - 0: emergency / emerg
   * - 1: alert
   * - 2: critical / crit
   * - 3: error / err
   * - 4: warning / warn
   * - 5: notice / note
   * - 6: info
   * - 7: debug
   *
   * @defaultValue: `error`
   */
  logLevel?: LoggerOptions['defaultLevel'] | false;

  /**
   * The directory where interim data generated by Spidergram is stored.
   * This defaults to './storage' in the current working directory,
   * and can also be overriden by setting the SPIDERGRAM_STORAGE_DIR
   * environment variable.
   *
   * @defaultValue `process.cwd() + '/storage'`
   */
  storageDirectory?: string;

  /**
   * The directory where reports and final artifacts generated by Spidergram
   * are stored. This defaults to the current working directory, and can also
   * be overriden by setting the SPIDERGRAM_OUTPUT_DIR environment variable.
   *
   * @defaultValue `process.cwd()`
   */
  outputDirectory?: string;

  /**
   * Configuration for the project's storage buckets. This defaults to
   * a local disk bucket at the path specified in `storageDirectory`.
   *
   * Using other TypeFS plugins, this can be changed to an S3 storage
   * directory, etc.
   */
  typefs?: FileConfiguration;

  /**
   * Connection details for an Arango database server. If no
   * connection information is specified, a localhost server
   * and 'root' user will be assumed.
   */
  arango?: ArangoConfig;

  /**
   * Alter the behavior of the core 'Resource' class by saving body HTML to a separate
   * key/value store, or the filesystem. On extremely large crawls with large sites (100K+
   * pages with 1M+ html payloads) switching to an alternative body storage mechanism can
   * make reporting queries significantly faster.
   */
  offloadBodyHtml?: 'db' | 'file';

  /**
   * Settings for the project's default URL normalizer. These control
   * which URLs will be considered duplicates of each other.
   *
   * Alternatively, a custom function can be passed in for more control
   * over the URL transformation process.
   */
  normalizer?: NormalizerOptions | UrlMutators.UrlMutator;

  /**
   * Configuration options for Crawlee, the web scraping toolkit used by
   * Spidergram. By default, Spidergram will map its own logging, storage,
   * and memory settings to Crawlee's. This configuration property can be used
   * to explicitly alter Crawlee's configuration with options or a
   * pre-instantiated Crawlee Configuration instance.
   */
  crawlee?: CrawleeConfigOptions | CrawleeConfig;

  /**
   * Spidergram's default options for Spidering/scraping sites. Custom options
   * can still be created and passed into the Spider at runtime, but the default
   * crawling, mimetype filtering, URL discovery, and other options can be set
   * here.
   */
  spider?: Partial<SpiderOptions>;

  /**
   * Global defaults for HTML to plaintext conversion.
   *
   * Some Spidergram tools override these defaults in order to accomplish specific tasks
   * (converting HTML to markdown, stripping images and links, etc) but these options will
   * be respcted whenever possible.
   */
  htmlToText?: HtmlToTextOptions;

  /**
   * Extraction options for structured metadata on crawled pages.
   */
  analysis?: PageAnalysisOptions;

  /**
   * An async {@link PageAnalyzer|Processor} function to be used as an override
   * for the default page processor.
   */
  analyzePageFn?: PageAnalyzer;

  /**
   * Extraction options for structured metadata on crawled pages.
   */
  pageContent?: PageContentOptions;

  /**
   * An async {@link PageContentExtractor|Extractor} function to be used as an override
   * for the default content extractor.
   */
  getPageContentFn?: PageContentExtractor;

  /**
   * Extraction options for structured metadata on crawled pages.
   */
  pageData?: PageDataOptions;

  /**
   * An async {@link PageDataExtractor|Extractor} function to be used as an override
   * for the default page extractor.
   */
  getPageDataFn?: PageDataExtractor;

  /**
   * Extraction options for structured metadata on crawled pages.
   */
  pageTechnologies?: TechAuditOptions;

  /**
   * A key/value collection of pre-written queries that can be used
   * elsewhere in Spidergram. Values can be {@link AqQuery|AqQuery} JSON objects,
   * {@link GeneratedAqlQuery|Generated AQL Queries} output by the @{link aql | aql}
   * function, or fully-instantiated Spidergram {@link Query|Query} objects.
   *
   * String values are assumed to be raw AQL and will be transformed into a
   * {@link GeneratedAqlQuery|Generated AQL Query}.
   */
  queries?: Record<string, string | AqQuery | GeneratedAqlQuery | Query>;

  /**
   * An object containing named report definitions in the form of {@link ReportConfig}
   * definition objects, or an already-instantiated Report instance.
   */
  reports?: Record<string, ReportConfig | Report>;

  /**
   * A class implementing the ConsoleTheme interface; this provides assorted
   * formatting and interaction helpers that Spidergram uses when displaying
   * information or controlling flow on the CLI. Making it pluggable here is
   * a bit of overkill, but lets us swap interesting stuff in and out without
   * rewriting all of our scripts.
   */
  cli?: SpiderCli;

  /**
   * A custom setup function to be run after Spidergram has been initialized
   * from the settings in its config file. The finalizer hook receives a reference
   * to the global Spidergram singleton object, and can use its methods (`setLogger`
   * and so on) to alter the global configuration.
   */
  finalizer?: (context: Spidergram) => Promise<void>;
}
