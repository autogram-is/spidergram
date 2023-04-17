import { Spidergram, Resource, HtmlTools, BrowserTools, UrlDiscoveryOptions } from '../../index.js';
import { rebuildResourceLinks } from './rebuild-resource-links.js';
import { PageDataOptions, PageContentOptions, PatternDefinition, findAndSavePagePatterns } from '../html/index.js';
import { TechAuditOptions } from '../browser/index.js';
import { PropertyMap, mapProperties } from '../map-properties.js';
import _ from 'lodash';
import { DateTime } from 'luxon';
import {
  MimeTypeMap,
  processResourceFile,
} from '../file/process-resource-file.js';
import { getResourceSite } from './get-resource-site.js';

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
  data?: PageDataOptions | boolean;

  /**
   * If a resource passed in for analysis has a file attachment, this mapping dictionary
   * determines which GenericFile class will be responsible for parsing it.
   *
   * Setting this value to `false` will bypass all downloaded file parsing.
   *
   * @defaultValues
   */
  files?: MimeTypeMap | false;

  /**
   * One or more {@link PropertyMap<Resource>} rules that determine what {@link Site}
   * the {@link Resource} belongs to.
   * 
   * The value here corresponds to the unique key of a {@link Site}; 
   */
  site?: PropertyMap<Resource> | PropertyMap<Resource>[] | false;

  /**
   * Options for content analysis, including the transformation of core page content
   * to plaintext, readability analysis, etc. Setting this to `false` skips all content
   * analysis.
   *
   * Note: By default, running content analysis will overwrite any information in a
   * Resource object's existing `content` property.
   */
  content?: PageContentOptions | boolean;

  /**
   * Options for technology fingerprinting. Setting this to `false` skips all fingerprinting.
   */
  tech?: TechAuditOptions | boolean;

  /**
   * Options for rebuilding the metadata for a page's outgoing links.
   *
   * @defaultValue: false
   */
  links?: UrlDiscoveryOptions | boolean;

  /**
   * A dictionary used to map existing data on a {@link Resource} to new properties.
   * If this property is set to `false`, property mapping is skipped entirely.
   * 
   * The key of each entry is the destination name or dot-notation path of a property
   * Resource, and the value of each entry is one or more {@link PropertyMap<Resource>}
   * rules describing where the new property's value should be found.
   * 
   * If an array is given, the individual {@link PropertyMap<Resource>} records will be
   * checked in order; the first one to produce a value will be used. If no value is
   * produced, the destination property will remain undefined.
   */
  properties?: Record<string, PropertyMap> | false;


  /**
   * An array of {@link PatternDefinition} rules used to detect instances of known design
   * components in each page's markup.
   */
  patterns?: PatternDefinition[] | false;
}

export async function analyzePage(
  resource: Resource,
  customOptions: PageAnalysisOptions = {},
): Promise<Resource> {
  const options: PageAnalysisOptions = _.defaultsDeep(
    customOptions,
    Spidergram.config.analysis,
  );

  if (options.data) {
    resource.data = await HtmlTools.getPageData(
      resource,
      options.data === true ? undefined : options.data,
    );
  }

  if (options.content) {
    resource.content = await HtmlTools.getPageContent(
      resource,
      options.content === true ? undefined : options.content,
    );
  }

  if (options.files !== false) {
    const fileData = await processResourceFile(
      resource,
      options.files ? options.files : {},
    );
    if (fileData.metadata) resource.data = fileData.metadata;
    if (fileData.content) resource.content = fileData.content;
  }

  if (options.tech) {
    await BrowserTools.TechAuditor.init(
      options.tech === true ? undefined : options.tech,
    );
    resource.tech = await BrowserTools.TechAuditor.run(resource).then(results =>
      BrowserTools.TechAuditor.summarizeByCategory(results),
    );
  }

  if (options.links) {
    await rebuildResourceLinks(
      resource,
      options.links === true ? undefined : options.links,
    );
  }

  if (options.properties) {
    mapProperties(resource, options.properties);
  }

  if (options.patterns) {
    await findAndSavePagePatterns(resource, options.patterns);
  }

  if (options.site) {
    resource.site = await getResourceSite(resource, options.site, true);
  }

  resource._analyzed = DateTime.now().toISO();

  return Promise.resolve(resource);
}
