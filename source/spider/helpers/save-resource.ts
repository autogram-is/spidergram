import {RespondsWith, Resource} from '../../model/index.js';
import {CombinedContext} from '../context.js';

export async function saveResource(
  context: CombinedContext,
  properties: Record<string, unknown> = {},
) {
  const {graph, requestMeta, uniqueUrl, request} = context;
  const results: Array<Resource | RespondsWith> = [];

  // We pull from the requestMeta, since we perform that step
  // before every single request, even if the full load is
  // eventually cancelled. The four properites from it can
  // be overridden by passing in custom values in the
  // `properties` object.
  results.push(new Resource({
    url: requestMeta!.url,
    code: requestMeta?.statusCode ?? -1,
    message: requestMeta!.statusMessage ?? '',
    headers: requestMeta!.headers ?? {},
    ...properties,
  }));

  // If a uniqueUrl exists in the global context, link the
  // Resource to it. May add an override later to skip this
  // step no matter what.
  if (uniqueUrl !== undefined) {
    results.push(new RespondsWith({
      url: context.uniqueUrl,
      method: context.response ? request.method : requestMeta?.method ?? 'UNKNOWN',
      resource: results[0] as Resource,
      redirects: requestMeta?.redirectUrls ?? [],
      headers: request.headers ?? {},
    }));
  }

  // There's probably a better way to do this; for now, it works.
  return graph.push(results).then(() => results[0] as Resource);
}
