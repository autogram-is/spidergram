import { Spidergram, Query, Reference, Entity, Site, aql } from "../../index.js"
import { PropertyFilter } from "./filter-by-property.js";

export type SiteDefinition = Record<string, unknown> & {
  /**
   * A unique identifier for the site.
   */
  id: string,
  
  /**
   * A human-friendly label for the site.
   */
  name?: string,

  /**
   * A description or other notes about the purpose and operation of the site.
   */
  description?: string,
  
  /**
   * One or more {@link PropertyFilter} records that determine whether a page
   * should belong to this site.
   */
  pages?: PropertyFilter | PropertyFilter[],
  
  /**
   * A list of site IDs, or one or more {@link PropertyFilter} records, that
   * determine which sites should be considered this one's "children".
   */
  children?: string[] | PropertyFilter | PropertyFilter[],

  /**
   * Overwrite existing `site` and `parent` values when assigning pages and
   * child sites to this site.
   * 
   * @defaultValue false
   */
  greedy?: boolean,

  /**
   * The id of this site's parent site.
   */
  parent?: string
}

export async function buildSiteList(
  sites: SiteDefinition[] = [],
  clear = false
) {
  const sg = await Spidergram.load();
  const rawSites = [...sg.config.sites ?? [], ...sites];

  // De-duplicate the sites, in case duplicate IDs have been used.
  // We may want to change this to a key/value setup.
  const siteList: Record<string, Site> = {
    default: new Site({
      key: 'default',
      name: 'Default site',
      description: 'This site defintion is used as a fallback when no other site definition can be matched.'
    })
  };
  
  for (const site of rawSites) {
    siteList[site.id] = new Site({
      ...site,
      key: site.id,
      parent: ensureSiteId(site.parent),
      greedy: undefined,
      filters: undefined,
      queries: undefined
    })
  }

  if (clear) {

  }
  return sg.arango.push(Object.values(siteList));
}

function ensureSiteId(input?: string) {
  if (input) {
    const parts = input.split('/');
    if (parts.length === 1) return `sites/${parts[0]}`;
    if (parts.length === 2) return `sites/${parts[1]}`;
  }
  return undefined;
}

/**
 * Delete a {@link Site} and remove references to it from {@link Resource.site}.
 * If a replacement site is offered, update the affected resources to point to
 * the new site.
 */
export async function deleteSite(
  site: Reference<Site>,
  replacement?: Reference<Site>,
) {
  const sid = Entity.idFromReference(site);

  if (replacement) {
    const rid = Entity.idFromReference(replacement);
    return Query.run(
      aql`FOR r IN resources FILTER r.site == ${sid} UPDATE r WITH { site: ${rid} } IN resources`,
    ).then(() => Query.run(aql`REMOVE ${sid}`));
  } else {
    return Query.run(
      aql`FOR r IN resources FILTER r.site == ${sid} UPDATE r WITH { site: null } IN resources`,
    ).then(() => Query.run(aql`REMOVE ${sid}`));
  }
}
