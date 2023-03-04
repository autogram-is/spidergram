import { RespondsWith, Resource, Project } from '../../index.js';
import { SpiderContext } from '../context.js';

export async function failureHandler(context: SpiderContext, error: Error) {
  const { request } = context;

  const graph = await Project.config().then(project => project.graph());

  const rs = new Resource({
    url: request.loadedUrl ?? request.url,
    code: findFailureCode(error),
    message: `(${error.name}: ${error.message})`,
    errors: request.errorMessages,
    headers: {},
  });

  const rw = new RespondsWith({
    url: `unique_urls/${request.uniqueKey}`,
    resource: rs,
    method: request.method,
    headers: request.headers ?? {},
  });

  await graph.push([rs, rw]);
  return Promise.resolve();
}

export function findFailureCode(error: Error | string) {
  const message = (typeof error === 'string') ? error : error.message;
  for (const [err, code] of Object.entries(internalErrorLookup)) {
    if (message.indexOf(err) > -1) return code;
  }
  return InternalError.UNKNOWN;
}

export enum InternalError {
  UNKNOWN = -1,

  NETWORK = -1000,
  DNS = -1010,
  RESET = -1020,
  TIMEOUT = -1030,

  SERVER = -2000,
  SERVERTIMEOUT = -2010,
  EMPTY = -2020,
  REDIRECT = -2030,
  COOKIE = -2040,
  COOKIEDOMAIN = -2041,

  TYPE = -3000,

  PLAYWRIGHT = -4000,
}

const internalErrorLookup = {
  // Network errors
  ENOTFOUND: InternalError.DNS,
  ECONNRESET: InternalError.RESET,
  ETIMEDOUT: InternalError.TIMEOUT,

  // Server response errors
  TimeoutError: InternalError.SERVERTIMEOUT,
  ERR_EMPTY_RESPONSE: InternalError.EMPTY,
  MaxRedirectsError: InternalError.REDIRECT,
  'RequestError: Cookie failed to parse': InternalError.COOKIE,
  "RequestError: Cookie not in this host's domain": InternalError.COOKIEDOMAIN,

  // Internal type errors
  TypeError: InternalError.TYPE,

  // Playwright errors
  'page.content': InternalError.PLAYWRIGHT,
};
