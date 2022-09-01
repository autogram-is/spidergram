import { ContextHandler } from '../util/context';
import { Listr, ListrTask, ListrTaskResult, ListrTaskWrapper } from 'listr2';
export class Pipeline extends Listr {

}
export class Task implements ListrTask<ContextHandler> {
  title?: string | undefined;
  task(ctx: ContextHandler, task: ListrTaskWrapper<any, any>): void | ListrTaskResult<any> {
    
  }
}