import { ParsedUrl, UrlFilters, UrlMutators } from '@autogram/url-tools';
import { IncomingHttpHeaders } from 'http';
import { ArangoStore } from '../arango-store.js';
import { UniqueUrl, Resource } from '../model/index.js';
import * as helpers from './spider-helper.js';
import { Request, PlaywrightCrawlingContext, CheerioCrawlingContext } from 'crawlee';

export type SupportedCrawlingContext = PlaywrightCrawlingContext | CheerioCrawlingContext;

export interface SpiderContext extends Required<SpiderOptions> {
  urlRules: UrlRules,
  responseRules: ResponseRules,
  saveResource: (context: SpiderLocalContext & { request: Request }, properties: Record<string, unknown>) => Promise<Resource>
  saveLink: (link: helpers.HtmlLink, context: SpiderLocalContext) => Promise<UniqueUrl>
}

export interface RequestPrecheck {
  url: string,
  redirectUrls?: URL[],
  headers: IncomingHttpHeaders,
  statusMessage?: string,
  statusCode: number,
}

export interface SpiderLocalContext extends SpiderContext {
  uniqueUrl?: UniqueUrl,
  resource?: Resource,
  precheck?: RequestPrecheck,
}

export interface SpiderOptions extends Record<string, unknown> {
  storage: ArangoStore,
  linkSelectors: LinkSelectors,
  urlNormalizer: UrlMutatorWithContext,
  saveUnparsableUrls: boolean,
  urlRules: Partial<UrlRules>,
  responseRules: Partial<ResponseRules>,
}

export const defaultSpiderOptions: SpiderContext = {
  storage: await ArangoStore.open(),
  linkSelectors: { default: 'body a' },
  urlRules: {
    save: () => true,
    enqueue: sameDomain,
  },
  responseRules: {
    status: () => false,
    download: () => false,
    parse: () => true,
  },
  saveUnparsableUrls: true,
  urlNormalizer: (url) => UrlMutators.defaultNormalizer(url),
  saveResource: helpers.saveResource,
  saveLink: helpers.saveLink,
}

export type UrlMutatorWithContext<T = unknown> = (
  found: ParsedUrl,
  current?: ParsedUrl,
  referer?: ParsedUrl,
  context?: SpiderLocalContext
) => ParsedUrl;

export type UrlFilterWithContext = (
  found: ParsedUrl,
  context?: SpiderLocalContext
) => boolean;

export interface LinkSelectors extends Record<string, string> {
  default: string,
}

/**
 * Reusable filters that determine what operations will be performed
 * on found and retrieved URLs. Additional filters can be added to control
 * crawler-specific behavior inside helper functions. Overriding
 * Spidergram's default request handler means these will be ignored
 * unless the custom handler calls them explicitly.
 */
 export interface UrlRules extends Record<string, UrlFilterWithContext | unknown> {
  /**
   * URLs that match this filter will be saved to the graph if encountered.
   * TRUE by default, meaning that any URLs located in a web response will
   * be saved.
   */
  save: UrlFilterWithContext,


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
 * 0. Start by assuming a default response with body.
 * 1. Should the incoming response be ignored?
 * 2. If no, should it be downloaded?
 * 3. If no, should only its status be saved?
 * 4. Otherwise, allow the default requestHandler to deal with it.
 * 5. 
 */

 type ResponseFilterWithContext = (response: RequestPrecheck, context?: SpiderLocalContext) => boolean;
 export interface ResponseRules extends Record<string, ResponseFilterWithContext | unknown> {
  /**
   * Responses that match this filter will be pinged to retrieve headers,
   * but no other processing should be performed.
   */
  status: ResponseFilterWithContext;

  /**
   * Responses that match this filter should be fully retrieved and their
   * payload saved as a file rather than in the resulting Resource's body
   * property. FALSE by default, meaning that non-HTML/XML response will
   * be tossed. If both saveBody and download return true, the data will
   * be saved in both locations.
   */
  download: ResponseFilterWithContext;

  /**
   * Responses that match this filter will be parsed to find new links.
   * The spider's LinkSelectors option, if populated, will control how
   * how links are located and tagged. TRUE by default.
   */
  parse: ResponseFilterWithContext;
}

export function sameDomain(foundUrl: ParsedUrl, context?: SpiderLocalContext): boolean {
  if (!UrlFilters.isWebProtocol(foundUrl)) return false

  const currentUrl = context?.uniqueUrl?.parsed;
  if (currentUrl === undefined) return false;

  return (foundUrl.domain.toLowerCase() === currentUrl.domain.toLowerCase())
}

export function sameHostname(foundUrl: ParsedUrl, context?: SpiderLocalContext): boolean {
  if (!UrlFilters.isWebProtocol(foundUrl)) return false

  const currentUrl = context?.uniqueUrl?.parsed;
  if (currentUrl === undefined) return false;

  return (foundUrl.hostname.toLowerCase() === currentUrl.hostname.toLowerCase())
}
