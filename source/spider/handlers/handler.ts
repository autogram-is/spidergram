import { CrawlingContext } from "crawlee";
import { SpiderLocalContext } from "../options";

export interface RequestHandler<Context extends CrawlingContext = CrawlingContext> {
  (context: SpiderLocalContext & Context): Promise<void>;
}