import { SpiderLocalContext } from "../options.js";
import * as helpers from '../spider-helper.js';
import { Request } from "crawlee";

export async function status(context: SpiderLocalContext & { request: Request }): Promise<void> {
  context.resource = await helpers.saveResource(context, { files: [] });
  return;
}