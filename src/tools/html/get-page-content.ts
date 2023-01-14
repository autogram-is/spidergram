import { HtmlTools, TextTools, Resource } from "../../index.js";
import _ from 'lodash';

export interface PageContent {
  [key: string]: unknown;
  title?: string;
  text?: string;
  readability?: TextTools.ReadabilityScore;
}

export interface PageContentOptions extends HtmlTools.PageTextOptions {
  readability?: boolean | TextTools.ReadabilityScoreOptions;
  postProcessor?: (content: PageContent, resource: Resource) => PageContent;
}

const defaults: PageContentOptions = {
  readability: true
};

export function getPageContent(input: Resource, customOptions: PageContentOptions = {}) {
  const options = _.defaultsDeep(customOptions, defaults);

  let results: PageContent | undefined;

  const text = HtmlTools.getPageText({ ...options, resource: input });
  if (text.length > 0) {
    const title = _.get(input, 'data.meta.og.title') as string | undefined ?? _.get(input, 'data.title') as string | undefined;

    results = { title, text };

    if (options.readability === true) {
      results.readability = TextTools.getReadabilityScore(text);
    } else if (typeof options.readability === 'object') {
      results.readability = TextTools.getReadabilityScore(text, options.readability);
    }

    if (options.postProcessor) {
      results = options.postProcessor(results, input);
    }
  }

  return results;
}