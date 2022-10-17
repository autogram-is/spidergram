import { UniqueUrl } from "../model/vertices/unique-url.js";
import { Resource } from "../model/resource.js";
import { ParsedUrl, UrlFilters, UrlMutators } from '@autogram/url-tools';
import { IncomingMessage } from 'http';
import { ArangoStore } from '../arango-store.js';

export interface SpiderOptions {
  storage: ArangoStore,
  linkSelectors: LinkSelectors,
  urlNormalizer: UrlMutatorWithContext,
  saveUnparsableUrls: boolean,
  urlRules: Partial<UrlRules>;
  responseRules: Partial<ResponseRules>;
}

export const defaultContext: SpiderContext = {
  storage: await ArangoStore.open(),
  linkSelectors: { default: 'body a' },
  urlRules: {
    save: () => true,
    enqueue: sameDomain,
  },
  responseRules: {
    abort: () => false,
    save: () => true,
    saveBody: () => true,
    download: () => false,
    parseLinks: () => true,
  },
  saveUnparsableUrls: true,
  urlNormalizer: (url) => UrlMutators.defaultNormalizer(url),
  currentUniqueUrl: undefined,
  currentResource: undefined
}

export interface SpiderContext extends Record<string, unknown>  {
  storage: ArangoStore,
  urlRules: UrlRules,
  linkSelectors: LinkSelectors,
  urlNormalizer: UrlMutatorWithContext,
  responseRules: ResponseRules,
  saveUnparsableUrls: boolean,
  currentUniqueUrl?: UniqueUrl,
  currentResource?: Resource,
}

export type UrlMutatorWithContext<T = unknown> = (
  found: ParsedUrl,
  current?: ParsedUrl,
  referer?: ParsedUrl,
  context?: SpiderContext
) => ParsedUrl;

export type UrlFilterWithContext = (
  found: ParsedUrl,
  context?: SpiderContext
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

 type ResponseFilterWithContext = (response: IncomingMessage, context?: SpiderContext) => boolean;
 export interface ResponseRules extends Record<string, ResponseFilterWithContext | unknown> {
  /**
   * Responses that match this filter will discarded; the requests are marked
   * as processed, but the requestHandler isn't fired, no new data should 
   * be saved to the graph, and no subsequent filters are checked.
   */
  abort: ResponseFilterWithContext;

  /**
   * Responses that match this filter should be saved to the graph. TRUE
   * by default, but can be overridden to ignore cases like 40x errors,
   * uninteresting MIMEtypes, etc.
   */
  save: ResponseFilterWithContext;

  /**
   * Responses that match this filter should be fully retrieved and their
   * payload saved as the 'body' property of the resulting Resource entity.
   * By default, the response's MIME type is checked and only HTML/XML are
   * saved.
   */
  saveBody: ResponseFilterWithContext;

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
  parseLinks: ResponseFilterWithContext;
}

export function sameDomain(foundUrl: ParsedUrl, context?: SpiderContext): boolean {
  if (!UrlFilters.isWebProtocol(foundUrl)) return false

  const currentUrl = context?.currentUniqueUrl?.parsed;
  if (currentUrl === undefined) return false;

  return (foundUrl.domain.toLowerCase() === currentUrl.domain.toLowerCase())
}

export function sameHostname(foundUrl: ParsedUrl, context?: SpiderContext): boolean {
  if (!UrlFilters.isWebProtocol(foundUrl)) return false

  const currentUrl = context?.currentUniqueUrl?.parsed;
  if (currentUrl === undefined) return false;

  return (foundUrl.hostname.toLowerCase() === currentUrl.hostname.toLowerCase())
}
