import { Arango } from './arango.js';
import { SpidergramCrawlingContext } from './spider/context.js';
import {
  UrlLike,
  UrlFilterWithContext,
} from './spider/urls/index.js';

export type ResponseFilterWithContext = (context: SpidergramCrawlingContext) => true;

export interface SpiderOptions {
  crawlName?: string,
  database?: Arango | string,
  seedUrls?: UrlLike[]
  urlRules?: UrlRules,
  responseRules?: ResponseRules,
}

export interface SpiderContext extends Record<string, unknown> {
  /**
   * Instance of our Arango database connection wrapper. This is used
   * to save any graph entities created by requestHandlers.
   */
  storage?: Arango,
  urlRules?: UrlRules,
  responseRules?: ResponseRules,
}

/**
 * Reusable filters that determine what operations will be performed
 * on found and retrieved URLs. Additional filters can be added to control
 * crawler-specific behavior inside helper functions. Overriding
 * Spidergram's default request handler means these will be ignored
 * unless the custom handler calls them explicitly.
 */
export interface UrlRules extends Record<string, UrlFilterWithContext | undefined> {
  /**
   * URLs that match this filter will be saved to the graph if encountered.
   * TRUE by default, meaning that any URLs located in a web response will
   * be saved.
   */
  save?: UrlFilterWithContext,

  /**
   * URLs that match this filter and return HTML/XML responses will be parsed
   * to find additional URLs. The spider's LinkSelectors option, if populated,
   * will control how links are located and tagged. TRUE by default.
   */
  parse?: UrlFilterWithContext,

  /**
   * URLs that match this filter will be enqued for crawling if encountered.
   * Defaults to 'if the found URL and current URL share the same domain'.
   */
  enqueue: UrlFilterWithContext,
};

/**
 * Rules that control what happens when our default hook examines
 * an incoming request response. These filters apply before request
 * handlers fire. Overriding Spidergram's preprocessor hook means
 * these will be ignored unless you call them explicitly.
 * 
 * Default logic:
 * 1. Should the incoming response be ignored?
 * 2. If no, should it be downloaded?
 * 3. If no, should only its status be saved?
 * 4. Otherwise, allow the default requestHandler to deal with it.
 */
export interface ResponseRules extends Record<string, ResponseFilterWithContext | undefined> {
  /**
   * Responses that match this filter will discarded; the requests are marked
   * as processed, but the requestHandler isn't fired and no new data should 
   * be saved to the graph.
   */
  abort?: ResponseFilterWithContext;

  /**
   * Responses that match this filter should be saved as a 'status' stub,
   * but the body/payload of the URL should not be downloaded. Common
   * cases include 40x errors, MIMEtypes we can't parse but would like
   * to record the existence of, etc.
   */
  status?: ResponseFilterWithContext;

  /**
   * Responses that match this filter should be saved, but their response
   * payload should be saved as a file rather than saved in the graph
   * Resource's body property. FALSE by default, meaning that non-HTML/XML
   * responses will be tossed.
   */
  download?: ResponseFilterWithContext;
}