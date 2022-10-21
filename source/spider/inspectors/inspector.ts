import { SpiderLocalContext }  from "../options.js";
import { Request } from "crawlee";

export interface RequestInspector {
  (request: Request, context: SpiderLocalContext): Promise<boolean>
}

export interface RequestInspectorContext extends SpiderLocalContext { request: Request }