import { Spidergram, Resource, HtmlTools, BrowserTools } from '../index.js';
import { PageDataOptions, PageContentOptions } from './html/index.js';
import { PageTechnologyOptions } from './browser/index.js';
import { PropertySource, findPropertyValue } from './find-property-value.js';
import is from '@sindresorhus/is';
import _ from 'lodash';

export type PageAnalyzer = (
  input: Resource,
  options: PageAnalysisOptions,
) => Promise<void>;

/**
 * Options to control the behavior of the processPage utility function.
 */
export interface PageAnalysisOptions extends Record<string, unknown> {
  /**
   * Options for structured data parsing, including HTML Meta tags and other
   * metadata standards. Setting this to `false` skips all metadata extraction.
   *
   * Note: By default, running data extraction will overwrite any information in a
   * Resource object's existing `data` property.
   */
  data?: PageDataOptions | false;

  /**
   * Options for content analysis, including the transformation of core page content
   * to plaintext, readability analysis, etc. Setting this to `false` skips all content
   * analysis.
   *  
   * Note: By default, running content analysis will overwrite any information in a
   * Resource object's existing `content` property.

   */
  content?: PageContentOptions | false;

  /**
   * Options for technology fingerprinting. Setting this to `false` skips all fingerprinting.
   */
  tech?: PageTechnologyOptions | false;

  /**
   * A dictionary describing simple data mapping operations that should be performed after
   * a page is processed. Each key is the name of a target property on the page object,
   * and each value is a string or {@link PropertySource} object describing where the target
   * property's value should be found.
   *
   * If an array of sources is supplied, they will be checked in order and the first match
   * will be
   */
  propertyMap?: Record<
    string,
    (string | PropertySource) | (string | PropertySource)[]
  >;
}

export async function analyzePage(
  resource: Resource,
  customOptions: PageAnalysisOptions = {},
): Promise<void> {
  const sg = await Spidergram.load();
  if (is.function_(sg.config.analyzePageFn)) {
    return sg.config.analyzePageFn(resource, customOptions);
  } else {
    return _analyzePage(resource, customOptions);
  }
}

async function _analyzePage(
  resource: Resource,
  customOptions: PageAnalysisOptions = {},
): Promise<void> {
  const options: PageAnalysisOptions = _.defaultsDeep(
    customOptions,
    Spidergram.config.pageAnalysis,
  );

  if (options.data) {
    resource.data = await HtmlTools.getPageData(resource, options.data);
  }

  if (options.content) {
    resource.content = await HtmlTools.getPageContent(
      resource,
      options.content,
    );
  }

  if (options.tech) {
    resource.tech = await BrowserTools.getPageTechnologies(
      resource,
      options.tech,
    );
  }

  if (options.propertyMap) {
    for (const [prop, source] of Object.entries(options.propertyMap)) {
      resource.set(prop, findPropertyValue(resource, source));
    }
  }

  return Promise.resolve();
}
