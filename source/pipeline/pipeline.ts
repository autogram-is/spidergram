import { Listr, ListrTask, ListrTaskResult, ListrTaskWrapper } from 'listr2';
import { ContextHandler } from '../util/context.js';

export class Pipeline extends Listr {}
export class Task implements ListrTask<ContextHandler> {
  title?: string | undefined;
  task(
    ctx: ContextHandler,
    task: ListrTaskWrapper<any, any>,
  ): void | ListrTaskResult<any> {}
}
