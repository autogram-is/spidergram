import { SupportedContexts, SpiderContext, SpiderLocalContext, RequestPrecheck } from '../options.js';
import { populateContextUrl} from '../spider-helper.js';

export async function setup(
  context: SupportedContexts,
  spiderContext: SpiderLocalContext
): Promise<void> {
  Object.assign(context, spiderContext);

  await populateContextUrl(context as (SpiderContext & SupportedContexts));
  const { request, sendRequest, responseRules } = context as (SpiderContext & SupportedContexts);

  const response = await sendRequest({ method: 'HEAD' });
  const precheck: RequestPrecheck = {
    url: response.url,
    redirectUrls: response.redirectUrls,
    statusCode: response.statusCode,
    statusMessage: response.statusMessage,
    headers: response.headers,
  };
  response.destroy();

  if (responseRules.status(precheck, context as SpiderLocalContext & SupportedContexts)) {
    request.skipNavigation = true;
    request.label = 'status';
  } else if (responseRules.download(precheck, context as SpiderLocalContext & SupportedContexts)) {
    request.skipNavigation = true;
    request.label = 'download';
  } else if (responseRules.parse(precheck, context as SpiderLocalContext & SupportedContexts)) {
    request.label = 'parse';
  }

  context.precheck = precheck;
}