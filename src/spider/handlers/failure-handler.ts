import {RespondsWith, Resource, Project} from '../../index.js';
import {SpiderContext} from '../context.js';

export async function failureHandler(context: SpiderContext, error: Error) {
  const {request} = context;

  const graph = await Project.config().then(project => project.graph());

  const rs = new Resource({
    url: request.loadedUrl ?? request.url,
    code: -1,
    message: `(${error.name}: ${error.message})`,
    headers: {},
  });

  const rw = new RespondsWith({
    url: `unique_url/${request.uniqueKey}`,
    resource: rs,
    method: request.method,
    headers: request.headers ?? {},
  });

  await graph.push([rs, rw]);
}
